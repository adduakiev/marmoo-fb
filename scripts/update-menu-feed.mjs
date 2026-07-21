import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const URL = process.env.MARMOO_MENU_URL || 'https://marmooolymp.choiceqr.com/online-menu';
const OUT = process.env.MARMOO_FEED_PATH || 'public/feed/marmoo-menu.xml';
const STATUS = process.env.MARMOO_FEED_STATUS_PATH || 'public/feed/status.json';
const esc = (v='') => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const norm = (v='') => String(v).normalize('NFKC').toLocaleLowerCase('uk-UA').replace(/[’`]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const val = (o, keys) => { for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return null; };
const idFor = (name) => createHash('sha1').update(norm(name)).digest('hex').slice(0,20);
function num(v){
  if(typeof v==='number'&&Number.isFinite(v)) return v;
  if(v&&typeof v==='object') for(const k of ['value','amount','price','current','final']){const n=num(v[k]);if(n!==null)return n;}
  if(typeof v!=='string') return null;
  const m=v.replace(/\u00a0/g,' ').match(/(\d{1,6}(?:[.,]\d{1,2})?)/); if(!m)return null;
  const n=Number(m[1].replace(',','.')); return Number.isFinite(n)?n:null;
}
function available(o){
  for(const k of ['inStock','in_stock','available','isAvailable','is_available','enabled','active']) if(typeof o?.[k]==='boolean') return o[k];
  for(const k of ['soldOut','sold_out','isSoldOut','disabled','inStopList','stopList']) if(typeof o?.[k]==='boolean') return !o[k];
  const s=String(o?.status??o?.availability??'').toLowerCase();
  if(['available','active','in_stock','instock'].includes(s))return true;
  if(['unavailable','inactive','out_of_stock','sold_out','soldout'].includes(s))return false;
  return null;
}
function collect(payload, source, out){
  const seen=new WeakSet();
  function walk(x, depth=0, ctx={}){
    if(depth>18||x==null)return;
    if(Array.isArray(x)){for(const y of x)walk(y,depth+1,ctx);return;}
    if(typeof x!=='object'||seen.has(x))return; seen.add(x);
    const ownName=val(x,['categoryName','category_name','sectionName','section_name']);
    const listLike=['items','products','dishes','offers','menuItems','menu_items'].some(k=>Array.isArray(x[k]));
    const next=(listLike&&typeof val(x,['name','title'])==='string')?{...ctx,category:String(val(x,['name','title']))}:ownName?{...ctx,category:String(ownName)}:ctx;
    const name=val(x,['dishName','dish_name','productName','product_name','title','name']);
    const price=num(val(x,['finalPrice','final_price','currentPrice','current_price','basePrice','base_price','price','cost']));
    const description=String(val(x,['description','shortDescription','short_description','composition','ingredients'])??'').trim();
    const image=String(val(x,['imageUrl','image_url','picture','photo','image','thumbnail'])??'').trim();
    const category=String(val(x,['categoryName','category_name'])??next.category??'Меню').trim();
    if(typeof name==='string'&&name.trim().length>1&&name.trim().length<180&&price!==null&&price>=0&&(description||image||category)){
      out.push({id:String(val(x,['id','uuid','innerId','inner_id','productId','product_id'])??idFor(name)),name:name.trim(),price,category,description,image,available:available(x),source});
    }
    for(const y of Object.values(x))walk(y,depth+1,next);
  }
  walk(payload);
}
function best(a,b){
  if(!a)return b;
  const score=x=>(x.source.startsWith('json:')?5:0)+(x.available!==null?3:0)+(x.description?2:0)+(x.image?1:0)+(x.category!=='Меню'?1:0);
  return score(b)>score(a)?b:a;
}
async function main(){
  const payloads=[]; const candidates=[];
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({locale:'uk-UA',timezoneId:'Europe/Kyiv',viewport:{width:1440,height:1200},userAgent:'Mozilla/5.0 Chrome/130 MARMOO-feed-bot/1.0'});
  const page=await context.newPage();
  page.on('response',async r=>{try{if((r.headers()['content-type']||'').includes('json'))payloads.push({url:r.url(),body:await r.json()});}catch{}});
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); await page.waitForTimeout(5000);
  for(const label of ['Прийняти','Погоджуюсь','Accept','Зрозуміло','Закрити']){const b=page.getByRole('button',{name:label,exact:false}).first();if(await b.count())await b.click({timeout:800}).catch(()=>{});}
  let last=0; for(let i=0;i<20;i++){const h=await page.evaluate(()=>document.documentElement.scrollHeight);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(600);if(h===last&&i>5)break;last=h;}
  const embedded=await page.evaluate(()=>[...document.querySelectorAll('#__NEXT_DATA__,script[type="application/ld+json"],script[type="application/json"]')].map(s=>s.textContent).filter(Boolean));
  for(const text of embedded)try{payloads.push({url:'dom:json',body:JSON.parse(text)});}catch{}
  const dom=await page.evaluate(()=>{
    const out=[]; const priceRe=/(\d{1,6}(?:[.,]\d{1,2})?)\s*(₴|грн|UAH)/i;
    const leaves=[...document.querySelectorAll('span,p,div,button')].filter(e=>e.children.length===0&&priceRe.test(e.textContent||''));
    for(const leaf of leaves){let box=leaf;for(let i=0;i<6&&box;i++,box=box.parentElement){const text=(box.innerText||'').replace(/\s+/g,' ').trim();const m=text.match(priceRe);if(!m||text.length>1600)continue;const names=[...box.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b')].map(e=>e.textContent?.trim()).filter(Boolean);const lines=(box.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);const name=names[0]||lines.find(x=>!priceRe.test(x)&&x.length>1&&x.length<180);if(!name)break;let h=box.previousElementSibling;while(h&&!/^H[1-6]$/.test(h.tagName))h=h.previousElementSibling;out.push({name,price:Number(m[1].replace(',','.')),category:h?.textContent?.trim()||'Меню',description:'',image:box.querySelector('img')?.currentSrc||box.querySelector('img')?.src||'',available:!/(немає|недоступн|sold out|out of stock)/i.test(text),source:'dom'});break;}}
    return out;
  });
  await browser.close();
  for(const p of payloads)collect(p.body,`json:${p.url}`,candidates); candidates.push(...dom);
  const map=new Map();
  for(const c of candidates){const k=norm(c.name);if(!k||c.name.length<2||c.name.length>180||!Number.isFinite(c.price))continue;map.set(k,best(map.get(k),c));}
  const items=[...map.values()].filter(x=>x.price>=0).sort((a,b)=>a.category.localeCompare(b.category,'uk')||a.name.localeCompare(b.name,'uk'));
  if(items.length<10)throw new Error(`Safety stop: only ${items.length} menu items found; previous feed kept.`);
  const groups=new Map(); for(const x of items){if(!groups.has(x.category))groups.set(x.category,[]);groups.get(x.category).push(x);}
  const now=new Date().toISOString(); let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<menu_feed version="1.0" generated_at="${now}" currency="UAH" source="MARMOO ChoiceQR live menu">\n  <restaurant><name>MARMOO.BISTRO</name><menu_url>${esc(URL)}</menu_url></restaurant>\n  <categories>\n`;
  for(const [category,rows] of groups){xml+=`    <category id="${idFor(category)}"><name>${esc(category)}</name>\n`;for(const x of rows){const a=x.available===false?'false':'true';const stock=x.available===false?'unavailable':x.available===true?'available':'unknown';xml+=`      <item id="${esc(x.id)}" active="${a}" stock_status="${stock}"><name>${esc(x.name)}</name><price currency="UAH">${x.price.toFixed(2)}</price>`;if(x.description)xml+=`<description>${esc(x.description)}</description>`;if(x.image)xml+=`<image_url>${esc(x.image)}</image_url>`;xml+=`<menu_url>${esc(URL)}</menu_url></item>\n`;}xml+='    </category>\n';}
  xml+='  </categories>\n</menu_feed>\n';
  await fs.mkdir('public/feed',{recursive:true}); await fs.writeFile(OUT,xml,'utf8');
  const status={ok:true,generated_at:now,timezone:'Europe/Kyiv',source_url:URL,total_items:items.length,categories:groups.size,json_responses_inspected:payloads.length,dom_candidates:dom.length};
  await fs.writeFile(STATUS,JSON.stringify(status,null,2)+'\n','utf8'); console.log(status);
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
