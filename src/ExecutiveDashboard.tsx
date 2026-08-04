import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowDownRight,ArrowUpRight,Lightbulb,RefreshCw,Sparkles,Target,TrendingUp,WalletCards} from 'lucide-react';
import {Payload,money,num,pct,parseDate} from './sales/data';
import {cleanProductRows,normalizeProductName} from './sales/semantic';

const DATA_URL=`${import.meta.env.BASE_URL||'/'}sales-data.json`;
const DAY=86400000;
const addDays=(d:Date,n:number)=>new Date(d.getTime()+n*DAY);
const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const delta=(a:number,b:number)=>b?(a-b)/b*100:null;
const tone=(v:number|null)=>v===null?'neutral':v>=0?'up':'down';

type Insight={title:string;detail:string;action:string;kind:'positive'|'warning'|'neutral'};

type Metric={label:string;current:number;previous:number;format:(v:number)=>string};

export default function ExecutiveDashboard(){
 const[data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const r=await fetch(`${DATA_URL}?_=${Date.now()}`,{cache:'no-store'});const p=await r.json() as Payload;if(Number(p.schemaVersion)!==2)throw Error('schemaVersion 2 required');setData(p)}catch(e){console.error(e);setData(null)}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);

 const model=useMemo(()=>{
  if(!data||!data.daily.length)return null;
  const latest=parseDate([...data.daily].sort((a,b)=>a.date.localeCompare(b.date)).at(-1)!.date);
  const currentFrom=addDays(latest,-6),previousTo=addDays(currentFrom,-1),previousFrom=addDays(previousTo,-6);
  const inWindow=(date:string,from:Date,to:Date)=>{const d=parseDate(date);return d>=from&&d<=to};
  const aggregate=(rows:any[])=>{const revenue=rows.reduce((s,x)=>s+Number(x.revenue||0),0),orders=rows.reduce((s,x)=>s+Number(x.orders||0),0),markup=rows.reduce((s,x)=>s+Number(x.markup||0),0);return{revenue,orders,markup,averageCheck:orders?revenue/orders:0,markupPercent:revenue?markup/revenue*100:0}};
  const current=aggregate(data.daily.filter(x=>inWindow(x.date,currentFrom,latest)));
  const previous=aggregate(data.daily.filter(x=>inWindow(x.date,previousFrom,previousTo)));

  const productMap=(from:Date,to:Date)=>{const map=new Map<string,{name:string;revenue:number;quantity:number;markup:number}>();cleanProductRows(data.productsDaily.filter(x=>inWindow(x.date,from,to)) as any).forEach((x:any)=>{const name=normalizeProductName(x.productName),key=name.toLowerCase(),cur=map.get(key)||{name,revenue:0,quantity:0,markup:0};cur.revenue+=Number(x.revenue)||0;cur.quantity+=Number(x.quantity)||0;cur.markup+=Number(x.markup)||0;map.set(key,cur)});return map};
  const pc=productMap(currentFrom,latest),pp=productMap(previousFrom,previousTo);
  const productTrends=[...pc.values()].map(x=>{const prev=pp.get(x.name.toLowerCase());return{...x,previousRevenue:prev?.revenue||0,change:delta(x.revenue,prev?.revenue||0)}}).filter(x=>x.previousRevenue>0&&x.revenue>=1000&&x.change!==null).sort((a,b)=>Math.abs(b.change!)-Math.abs(a.change!));

  const channelMap=(from:Date,to:Date)=>{const map=new Map<string,{channel:string;revenue:number;orders:number;markup:number}>();data.channelsDaily.filter(x=>inWindow(x.date,from,to)).forEach(x=>{const key=x.channel||'Без каналу',cur=map.get(key)||{channel:key,revenue:0,orders:0,markup:0};cur.revenue+=Number(x.revenue)||0;cur.orders+=Number(x.orders)||0;cur.markup+=Number(x.markup)||0;map.set(key,cur)});return map};
  const cc=channelMap(currentFrom,latest),cp=channelMap(previousFrom,previousTo);
  const channelTrends=[...cc.values()].map(x=>{const prev=cp.get(x.channel);return{...x,previousRevenue:prev?.revenue||0,change:delta(x.revenue,prev?.revenue||0),averageCheck:x.orders?x.revenue/x.orders:0}}).filter(x=>x.previousRevenue>0&&x.change!==null).sort((a,b)=>b.revenue-a.revenue);

  const insights:Insight[]=[];
  const revenueChange=delta(current.revenue,previous.revenue),checkChange=delta(current.averageCheck,previous.averageCheck),ordersChange=delta(current.orders,previous.orders),markupChange=delta(current.markup,previous.markup);
  if(revenueChange!==null)insights.push({title:revenueChange>=0?'Оборот зростає':'Оборот просідає',detail:`За останні 7 днів оборот змінився на ${revenueChange.toFixed(1)}% до попередніх 7 днів.`,action:revenueChange>=0?'Закріпити сильні канали та страви, що дали приріст.':'Перевірити падіння чеків, середнього чека та ключових каналів.',kind:revenueChange>=0?'positive':'warning'});
  if(checkChange!==null&&Math.abs(checkChange)>=3)insights.push({title:checkChange>=0?'Середній чек росте':'Середній чек знижується',detail:`Зміна середнього чека: ${checkChange.toFixed(1)}%.`,action:checkChange>=0?'Підсилити комбінації та допродажі, що вже працюють.':'Переглянути структуру чека й роботу з допродажами.',kind:checkChange>=0?'positive':'warning'});
  const strongestProduct=productTrends.filter(x=>x.change!>10).sort((a,b)=>b.change!-a.change!)[0];
  const weakestProduct=productTrends.filter(x=>x.change!<-10).sort((a,b)=>a.change!-b.change!)[0];
  if(strongestProduct)insights.push({title:`Росте: ${strongestProduct.name}`,detail:`Оборот позиції зріс на ${strongestProduct.change!.toFixed(1)}%.`,action:'Підсвітити у меню, комунікаціях і рекомендаціях персоналу.',kind:'positive'});
  if(weakestProduct)insights.push({title:`Просідає: ${weakestProduct.name}`,detail:`Оборот позиції впав на ${Math.abs(weakestProduct.change!).toFixed(1)}%.`,action:'Перевірити доступність, подачу, ціну та місце в меню.',kind:'warning'});
  const strongestChannel=channelTrends.filter(x=>x.change!>5).sort((a,b)=>b.change!-a.change!)[0];
  if(strongestChannel)insights.push({title:`Сильний канал: ${strongestChannel.channel}`,detail:`Канал додав ${strongestChannel.change!.toFixed(1)}% обороту.`,action:'Підтримати канал промо та доступністю хітових позицій.',kind:'positive'});
  if(!insights.length)insights.push({title:'Показники стабільні',detail:'Значних відхилень за останні два тижні не виявлено.',action:'Продовжувати спостереження за каналами, чеком і меню.',kind:'neutral'});

  const metrics:Metric[]=[
   {label:'Оборот',current:current.revenue,previous:previous.revenue,format:money},
   {label:'Чеки',current:current.orders,previous:previous.orders,format:num},
   {label:'Середній чек',current:current.averageCheck,previous:previous.averageCheck,format:money},
   {label:'Націнка',current:current.markup,previous:previous.markup,format:money},
  ];
  return{latest,currentFrom,previousFrom,previousTo,current,previous,metrics,productTrends,channelTrends,insights,ordersChange,markupChange};
 },[data]);

 if(loading)return <div className="flex min-h-screen items-center justify-center bg-[#4d071e] text-white"><RefreshCw className="animate-spin"/></div>;
 if(!data||!model)return <div className="flex min-h-screen items-center justify-center bg-[#4d071e]"><button onClick={load} className="rounded-xl bg-[#cfeeed] px-5 py-3 font-bold text-[#5b0b25]">Повторити</button></div>;

 return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#7d1640_0%,#580822_34%,#3c0417_100%)] text-white"><div className="mx-auto max-w-[1600px] px-4 py-7 md:px-8">
  <header className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[10px] uppercase tracking-[.24em] text-white/45">MARMOO Intelligence</p><h1 className="mt-2 text-4xl font-black text-[#d8f4f2] md:text-5xl">Executive Intelligence</h1><p className="mt-3 text-sm font-semibold text-[#cfeeed]/75">Автоматичні управлінські висновки · {iso(model.currentFrom)} — {iso(model.latest)}</p></div><button onClick={load} className="inline-flex self-start items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm font-bold"><RefreshCw size={17}/> Оновити</button></header>

  <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{model.metrics.map((m,i)=>{const d=delta(m.current,m.previous),t=tone(d);return <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase text-white/45">{m.label}</p>{i===0?<WalletCards size={18}/>:<TrendingUp size={18}/>}</div><div className="mt-2 text-3xl font-black text-[#d8f4f2]">{m.format(m.current)}</div><div className={`mt-2 flex items-center gap-1 text-xs font-black ${t==='up'?'text-emerald-300':t==='down'?'text-rose-300':'text-white/40'}`}>{t==='up'?<ArrowUpRight size={14}/>:t==='down'?<ArrowDownRight size={14}/>:null}{d===null?'—':`${d>=0?'+':''}${d.toFixed(1)}%`} до попередніх 7 днів</div></div>})}</div>

  <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[.055] p-5 md:p-7"><div className="mb-5 flex items-center gap-3"><Sparkles className="text-[#cfeeed]"/><div><h2 className="text-2xl font-black text-[#d8f4f2]">Що потребує уваги</h2><p className="text-sm text-white/50">Автоматичні висновки за продажами, меню та каналами</p></div></div><div className="grid gap-4 lg:grid-cols-2">{model.insights.map((x,i)=><div key={`${x.title}-${i}`} className={`rounded-2xl border p-5 ${x.kind==='positive'?'border-emerald-200/20 bg-emerald-100/10':x.kind==='warning'?'border-rose-200/20 bg-rose-100/10':'border-white/10 bg-white/[.04]'}`}><div className="flex items-start gap-3">{x.kind==='warning'?<AlertTriangle className="mt-1 text-rose-200"/>:x.kind==='positive'?<Target className="mt-1 text-emerald-200"/>:<Lightbulb className="mt-1 text-[#cfeeed]"/>}<div><h3 className="font-black">{x.title}</h3><p className="mt-2 text-sm text-white/65">{x.detail}</p><p className="mt-3 text-sm font-bold text-[#cfeeed]">Дія: {x.action}</p></div></div></div>)}</div></section>

  <div className="grid gap-6 xl:grid-cols-2"><TrendTable title="Динаміка страв" rows={model.productTrends.slice(0,10).map(x=>({name:x.name,value:money(x.revenue),change:x.change}))}/><TrendTable title="Динаміка каналів" rows={model.channelTrends.slice(0,10).map(x=>({name:x.channel,value:money(x.revenue),change:x.change}))}/></div>
 </div></div>
}

function TrendTable({title,rows}:{title:string;rows:{name:string;value:string;change:number|null}[]}){return <section className="rounded-[28px] border border-white/10 bg-white/[.055] p-5 md:p-7"><h2 className="mb-4 text-xl font-black text-[#d8f4f2]">{title}</h2><div className="space-y-2">{rows.length?rows.map(x=><div key={x.name} className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-3"><div className="max-w-[60%] font-bold">{x.name}</div><div className="text-right"><div className="font-black text-[#cfeeed]">{x.value}</div><div className={`text-xs font-black ${x.change!==null&&x.change>=0?'text-emerald-300':'text-rose-300'}`}>{x.change===null?'—':`${x.change>=0?'+':''}${x.change.toFixed(1)}%`}</div></div></div>):<div className="text-sm text-white/45">Недостатньо даних для порівняння.</div>}</div></section>}
