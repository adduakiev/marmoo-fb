import fs from 'node:fs/promises';

const FEED_PATH = process.env.MARMOO_FEED_PATH || 'public/feed/marmoo-menu.xml';
const STATUS_PATH = process.env.MARMOO_FEED_STATUS_PATH || 'public/feed/status.json';
const SITEMAP_URL = process.env.MARMOO_SITEMAP_URL || 'https://marmooolymp.choiceqr.com/sitemap.xml';
const BASE_URL = 'https://marmooolymp.choiceqr.com';

const decodeXml = (value = '') => String(value)
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const translitMap = {
  а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',і:'i',ї:'i',й:'i',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',
  ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia',ы:'y',э:'e',ё:'e',ъ:''
};

function translit(value = '') {
  return String(value).toLowerCase().split('').map(ch => translitMap[ch] ?? ch).join('');
}

function slugify(value = '') {
  return translit(String(value).normalize('NFKC'))
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalize(value = '') {
  return String(value).toLowerCase().normalize('NFKC')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(value = '') {
  return new Set(slugify(value).split('-').filter(t => t.length > 1));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function urlPathText(url) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  } catch {
    return url;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'MARMOO-feed-bot/1.2 (+https://adduakiev.github.io/marmoo-fb/)' },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`Sitemap request failed: ${response.status} ${response.statusText}`);
  return response.text();
}

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map(match => decodeXml(match[1].trim()))
    .filter(url => /^https?:\/\//i.test(url));
}

function scoreUrl(item, url) {
  const path = urlPathText(url);
  const pathSlug = slugify(path);
  const nameSlug = slugify(item.name);
  const id = String(item.id || '').toLowerCase();
  let score = 0;

  if (id && url.toLowerCase().includes(id)) score += 100;
  if (pathSlug === nameSlug) score += 90;
  if (pathSlug.endsWith(nameSlug) || nameSlug.endsWith(pathSlug)) score += 60;
  if (pathSlug.includes(nameSlug) || nameSlug.includes(pathSlug)) score += 45;
  score += Math.round(jaccard(tokens(item.name), tokens(path)) * 40);

  const generic = /(?:^|\/)(?:online-menu|booking|feedback|delivery|about|contacts?)\/?$/i.test(new URL(url).pathname);
  if (generic) score -= 100;
  return score;
}

async function main() {
  let feed = await fs.readFile(FEED_PATH, 'utf8');
  const sitemapXml = await fetchText(SITEMAP_URL);
  const sitemapUrls = parseLocs(sitemapXml);
  if (!sitemapUrls.length) throw new Error('Sitemap contains no <loc> URLs');

  const itemPattern = /<item\s+([^>]*?id="([^"]+)"[^>]*)>([\s\S]*?)<\/item>/g;
  let matched = 0;
  let unmatched = 0;
  const usedUrls = new Set();

  feed = feed.replace(itemPattern, (full, attrs, id, body) => {
    const nameMatch = body.match(/<name>([\s\S]*?)<\/name>/i);
    if (!nameMatch) return full;
    const name = decodeXml(nameMatch[1].trim());
    const item = { id, name };

    let bestUrl = '';
    let bestScore = -Infinity;
    for (const url of sitemapUrls) {
      const score = scoreUrl(item, url);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = url;
      }
    }

    // A high threshold prevents assigning a wrong dish page.
    if (!bestUrl || bestScore < 55 || (usedUrls.has(bestUrl) && bestScore < 100)) {
      unmatched += 1;
      return full;
    }

    usedUrls.add(bestUrl);
    matched += 1;
    const dishUrlTag = `<dish_url>${escapeXml(bestUrl)}</dish_url>`;
    if (/<dish_url>[\s\S]*?<\/dish_url>/i.test(body)) {
      body = body.replace(/<dish_url>[\s\S]*?<\/dish_url>/i, dishUrlTag);
    } else if (/<menu_url>[\s\S]*?<\/menu_url>/i.test(body)) {
      body = body.replace(/<menu_url>[\s\S]*?<\/menu_url>/i, dishUrlTag);
    } else {
      body += dishUrlTag;
    }
    return `<item ${attrs}>${body}</item>`;
  });

  if (matched < 10) throw new Error(`Safety stop: only ${matched} dish URLs matched from sitemap`);
  await fs.writeFile(FEED_PATH, feed, 'utf8');

  let status = {};
  try { status = JSON.parse(await fs.readFile(STATUS_PATH, 'utf8')); } catch {}
  status.sitemap_url = SITEMAP_URL;
  status.sitemap_urls_found = sitemapUrls.length;
  status.dish_urls_matched = matched;
  status.dish_urls_unmatched = unmatched;
  status.dish_urls_updated_at = new Date().toISOString();
  await fs.writeFile(STATUS_PATH, JSON.stringify(status, null, 2) + '\n', 'utf8');
  console.log({ sitemap_urls: sitemapUrls.length, matched, unmatched });
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
