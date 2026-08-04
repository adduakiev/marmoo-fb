import fs from 'node:fs';
import path from 'node:path';

const ordersPath=process.argv[2]||'tmp/BI_ORDERS.csv';
const itemsPath=process.argv[3]||'tmp/BI_ORDER_ITEMS.csv';
const outPath=process.argv[4]||'public/intelligence-data.json';

function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i],next=text[i+1];
  if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;continue}
  if(ch==='"'){quoted=!quoted;continue}
  if(ch===','&&!quoted){row.push(cell);cell='';continue}
  if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';continue}
  cell+=ch;
 }
 row.push(cell);if(row.some(v=>v!==''))rows.push(row);
 const headers=(rows.shift()||[]).map(x=>x.trim());
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
}

const number=v=>{const n=Number(String(v??'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
function isoDate(value){
 const raw=String(value??'').trim();if(!raw)return'';
 if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);
 const serial=Number(raw);if(Number.isFinite(serial)&&serial>30000){const ms=Math.round((serial-25569)*86400000);return new Date(ms).toISOString().slice(0,10)}
 const d=new Date(raw);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}
function normalizeName(raw){return String(raw||'').replace(/\s+/g,' ').trim().replace(/^\s*[ДD]\s+[\-–—:]?\s*/u,'').replace(/^\s*(?:АКЦ(?:ІЯ)?|АКЦИЯ|АКЦІЯ|PROMO|ПРОМО)\s*[\-–—:]?\s*/iu,'').trim()}
const serviceRx=/(пакет|пакув|хоз|сервет|прибор|вилка|ніж|контейнер|палички|доставка|чайов|сервісн)/iu;
function isService(row){return serviceRx.test(`${row.product_name||''} ${row.category||''} ${row.category_level_3||''}`)}
function normalizePhone(raw){const matches=String(raw||'').match(/(?:\+?38)?0\d{9}/g)||[];if(!matches.length)return'';let d=matches[0].replace(/\D/g,'');if(d.length===10&&d.startsWith('0'))d=`38${d}`;return d.length===12&&d.startsWith('380')?d:''}
function scoreByQuantile(value,sorted,reverse=false){if(!sorted.length)return 1;const rank=sorted.filter(x=>x<=value).length/sorted.length;const score=Math.min(5,Math.max(1,Math.ceil(rank*5)));return reverse?6-score:score}
function rfmSegment(r,f,m){if(r>=4&&f>=4&&m>=4)return'VIP / Чемпіони';if(r>=3&&f>=4)return'Лояльні активні';if(r>=4&&f<=2)return'Нові перспективні';if(r<=2&&f>=4)return'У ризику';if(r<=2&&f<=2)return'Сплячі';if(m>=4)return'Високий потенціал';return'Регулярні'}

if(!fs.existsSync(ordersPath)||!fs.existsSync(itemsPath))throw new Error(`Missing BI files: ${ordersPath}, ${itemsPath}`);
const orders=parseCsv(fs.readFileSync(ordersPath,'utf8'));
const items=parseCsv(fs.readFileSync(itemsPath,'utf8'));
const validOrders=orders.filter(o=>number(o.order_revenue)>0&&o.order_id);
const validOrderIds=new Set(validOrders.map(o=>o.order_id));
const cleanItems=items.filter(i=>validOrderIds.has(i.order_id)&&number(i.quantity)>0&&number(i.revenue)>0&&!isService(i)).map(i=>({...i,product_name:normalizeName(i.product_name)}));

const ordersById=new Map(validOrders.map(o=>[o.order_id,o]));
const productsByOrder=new Map();
for(const item of cleanItems){if(!productsByOrder.has(item.order_id))productsByOrder.set(item.order_id,new Set());productsByOrder.get(item.order_id).add(item.product_name)}
const productOrderCount=new Map(),pairCount=new Map();
for(const products of productsByOrder.values()){
 const arr=[...products].sort();for(const p of arr)productOrderCount.set(p,(productOrderCount.get(p)||0)+1);
 for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const k=`${arr[i]}|||${arr[j]}`;pairCount.set(k,(pairCount.get(k)||0)+1)}
}
const totalOrders=validOrders.length;
const basketPairs=[...pairCount.entries()].map(([key,coOccurrence])=>{const[itemA,itemB]=key.split('|||');const a=productOrderCount.get(itemA)||0,b=productOrderCount.get(itemB)||0;const support=coOccurrence/totalOrders,confidenceAtoB=coOccurrence/a,confidenceBtoA=coOccurrence/b,lift=confidenceAtoB/(b/totalOrders);return{itemA,itemB,coOccurrence,support,confidenceAtoB,confidenceBtoA,lift}}).filter(x=>x.coOccurrence>=3).sort((a,b)=>b.lift-a.lift||b.coOccurrence-a.coOccurrence).slice(0,500);

const customerMap=new Map();let latest='';
for(const o of validOrders){const date=isoDate(o.sale_date);if(date>latest)latest=date;const phone=normalizePhone(o.customer_phone||o.customer_phone_raw);if(!phone)continue;const cur=customerMap.get(phone)||{phone,ordersCount:0,totalSpend:0,firstOrderDate:date,lastOrderDate:date,channels:new Set()};cur.ordersCount++;cur.totalSpend+=number(o.order_revenue);if(date<cur.firstOrderDate)cur.firstOrderDate=date;if(date>cur.lastOrderDate)cur.lastOrderDate=date;if(o.channel)cur.channels.add(o.channel);customerMap.set(phone,cur)}
const reference=latest?new Date(`${latest}T00:00:00`):new Date();
const baseProfiles=[...customerMap.values()].map(c=>({...c,averageCheck:c.ordersCount?c.totalSpend/c.ordersCount:0,recencyDays:Math.max(0,Math.round((reference-new Date(`${c.lastOrderDate}T00:00:00`))/86400000)),channels:[...c.channels]}));
const recencies=baseProfiles.map(x=>x.recencyDays).sort((a,b)=>a-b),frequencies=baseProfiles.map(x=>x.ordersCount).sort((a,b)=>a-b),monetaries=baseProfiles.map(x=>x.totalSpend).sort((a,b)=>a-b);
const customerProfiles=baseProfiles.map(c=>{const r=scoreByQuantile(c.recencyDays,recencies,true),f=scoreByQuantile(c.ordersCount,frequencies),m=scoreByQuantile(c.totalSpend,monetaries);return{...c,rScore:r,fScore:f,mScore:m,rfmScore:`${r}${f}${m}`,segment:rfmSegment(r,f,m)}}).sort((a,b)=>b.totalSpend-a.totalSpend);

const drinkMap=new Map();
for(const o of validOrders){const channel=String(o.channel||'Без каналу').trim()||'Без каналу';const cur=drinkMap.get(channel)||{channel,orders:0,ordersWithDrink:0,foodOnlyOrders:0,revenue:0};cur.orders++;cur.revenue+=number(o.order_revenue);if(number(o.has_drink)>0)cur.ordersWithDrink++;if(String(o.basket_type||'').toLowerCase().includes('тільки їжа'))cur.foodOnlyOrders++;drinkMap.set(channel,cur)}
const drinkAttachment=[...drinkMap.values()].map(x=>({...x,attachmentRate:x.orders?x.ordersWithDrink/x.orders*100:0,foodOnlyRate:x.orders?x.foodOnlyOrders/x.orders*100:0})).sort((a,b)=>b.orders-a.orders);

const heatMap=new Map();
for(const o of validOrders){const weekday=String(o.weekday||'').trim(),hour=number(o.open_hour);if(!weekday||hour<0||hour>23)continue;const key=`${weekday}|${hour}`;const cur=heatMap.get(key)||{weekday,weekdayNumber:number(o.weekday_number),hour,orders:0,revenue:0};cur.orders++;cur.revenue+=number(o.order_revenue);heatMap.set(key,cur)}
const heatmap=[...heatMap.values()].map(x=>({...x,averageCheck:x.orders?x.revenue/x.orders:0})).sort((a,b)=>a.weekdayNumber-b.weekdayNumber||a.hour-b.hour);

const payload={schemaVersion:1,generatedAt:new Date().toISOString(),source:{spreadsheetId:'1EhKZ6oP95aXe3GL4iIDfGd5NmYbQPKIHat4Sml76TKo',ordersRows:orders.length,itemRows:items.length,validOrders:validOrders.length,validItems:cleanItems.length,latestDate:latest},basketPairs,customerProfiles,drinkAttachment,heatmap};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(payload));
console.log(`Intelligence data: ${validOrders.length} orders, ${basketPairs.length} pairs, ${customerProfiles.length} customers, ${drinkAttachment.length} channels, ${heatmap.length} heatmap cells`);
