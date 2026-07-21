import fs from 'node:fs/promises';

const FEED_PATH = process.env.MARMOO_FEED_PATH || 'public/feed/marmoo-menu.xml';
const STATUS_PATH = process.env.MARMOO_FEED_STATUS_PATH || 'public/feed/status.json';
const SITEMAP_URL = process.env.MARMOO_SITEMAP_URL || 'https://marmooolymp.choiceqr.com/sitemap.xml';

const decodeXml = (v = '') => String(v)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const escapeXml = (v = '') => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const translitMap = {
  а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',і:'i',ї:'i',й:'i',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',
  ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia',ы:'y',э:'e',ё:'e',ъ:''
};
const translit = (v = '') => String(v).toLowerCase().split('').map(ch => translitMap[ch] ?? ch).join('');
const slugify = (v = '') => translit(String(v).normalize('NFKC'))
  .replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tokens = (v = '') => new Set(slugify(v).split('-').filter(t => t.length > 1));

function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const t of A) if (B.has(t)) common++;
  return common / Math.max(A.size, B.size);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'MARMOO-feed-bot/1.3 (+https://adduakiev.github.io/marmoo-fb/)' }
  });
  if (!response.ok) throw new Error(`Sitemap request failed: ${response.status}`);
  return response.text();
}

function parseDirectDishUrls(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map(m => decodeXml(m[1].trim()))
    .filter(url => {
      try {
        const p = new URL(url).pathname.replace(/\/+$/, '');
        const parts = p.split('/').filter(Boolean);
        // ChoiceQR direct dish pages look like /section:<section-slug>/<dish-slug>.
        return parts.length >= 2 && parts.some(x => x.startsWith('section:')) && !parts.at(-1).startsWith('section:');
      } catch { return false; }
    });
}

function dishSlug(url) {
  try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) || ''); }
  catch { return ''; }
}

function score(item, url) {
  const slug = dishSlug(url);
  const nameSlug = slugify(item.name);
  const urlSlug = slugify(slug);
  let s = 0;
  if (String(item.id).toLowerCase() && url.toLowerCase().includes(String(item.id).toLowerCase())) s += 100;
  if (urlSlug === nameSlug) s += 100;
  if (urlSlug.includes(nameSlug) || nameSlug.includes(urlSlug)) s += 55;
  s += Math.round(similarity(item.name, slug) * 60);
  return s;
}

async function main() {
  let feed = await fs.readFile(FEED_PATH, 'utf8');
  // Remove previous incorrect/generic dish_url values before rematching.
  feed = feed.replace(/<dish_url>[\s\S]*?<\/dish_url>/gi, '');

  const sitemapXml = await fetchText(SITEMAP_URL);
  const urls = parseDirectDishUrls(sitemapXml);
  if (!urls.length) throw new Error('No direct dish URLs found in sitemap');

  const itemPattern = /<item\s+([^>]*?id="([^"]+)"[^>]*)>([\s\S]*?)<\/item>/g;
  const used = new Set();
  let matched = 0;
  let unmatched = 0;

  feed = feed.replace(itemPattern, (full, attrs, id, body) => {
    const nameMatch = body.match(/<name>([\s\S]*?)<\/name>/i);
    if (!nameMatch) return full;
    const item = { id, name: decodeXml(nameMatch[1].trim()) };
    let bestUrl = '', bestScore = -1;
    for (const url of urls) {
      const current = score(item, url);
      if (current > bestScore) { bestScore = current; bestUrl = url; }
    }

    if (!bestUrl || bestScore < 65 || used.has(bestUrl)) {
      unmatched++;
      return `<item ${attrs}>${body}</item>`;
    }

    used.add(bestUrl);
    matched++;
    const tag = `<dish_url>${escapeXml(bestUrl)}</dish_url>`;
    if (/<updated_at>/i.test(body)) body = body.replace(/<updated_at>/i, `${tag}<updated_at>`);
    else body += tag;
    return `<item ${attrs}>${body}</item>`;
  });

  if (matched < 10) throw new Error(`Safety stop: only ${matched} direct dish URLs matched`);
  await fs.writeFile(FEED_PATH, feed, 'utf8');

  let status = {};
  try { status = JSON.parse(await fs.readFile(STATUS_PATH, 'utf8')); } catch {}
  Object.assign(status, {
    sitemap_url: SITEMAP_URL,
    sitemap_direct_dish_urls_found: urls.length,
    dish_urls_matched: matched,
    dish_urls_unmatched: unmatched,
    dish_urls_updated_at: new Date().toISOString(),
    dish_url_rule: 'Only /section:<section>/<dish> direct pages are accepted'
  });
  await fs.writeFile(STATUS_PATH, JSON.stringify(status, null, 2) + '\n', 'utf8');
  console.log({ direct_urls: urls.length, matched, unmatched });
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
