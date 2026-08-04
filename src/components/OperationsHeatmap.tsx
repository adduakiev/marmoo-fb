import type{IntelligenceHeatmapCell}from'../sales/intelligence';
import{money,num}from'../sales/data';

type Metric='orders'|'revenue'|'averageCheck';
const days=['Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота','Неділя'];
const shortDay=(day:string)=>day.slice(0,2);

export default function OperationsHeatmap({cells,metric='orders',title='Завантаження 7×24'}:{cells:IntelligenceHeatmapCell[];metric?:Metric;title?:string}){
 const hours=Array.from({length:13},(_,i)=>i+10);
 const map=new Map(cells.map(x=>[`${x.weekday}|${x.hour}`,x]));
 const values=cells.map(x=>Number(x[metric])||0),max=Math.max(...values,1);
 const format=(cell:IntelligenceHeatmapCell|undefined)=>{if(!cell)return'—';if(metric==='revenue'||metric==='averageCheck')return money(cell[metric]);return `${num(cell.orders)} чеків`};
 return <section className="rounded-[28px] border border-white/10 bg-white/[.055] p-5 md:p-7"><div className="mb-5"><h2 className="text-2xl font-black text-[#d8f4f2]">{title}</h2><p className="mt-1 text-sm text-white/50">Чим яскравіша клітинка, тим вища активність у конкретний день та годину</p></div><div className="overflow-x-auto"><div className="min-w-[920px]"><div className="grid grid-cols-[76px_repeat(13,minmax(54px,1fr))] gap-2 text-center text-[10px] font-black uppercase text-white/35"><div/>{hours.map(h=><div key={h}>{h}:00</div>)}</div><div className="mt-2 space-y-2">{days.map(day=><div key={day} className="grid grid-cols-[76px_repeat(13,minmax(54px,1fr))] gap-2"><div className="flex items-center text-xs font-black text-white/55">{shortDay(day)}</div>{hours.map(hour=>{const cell=map.get(`${day}|${hour}`),value=cell?Number(cell[metric])||0:0,alpha=value?Math.max(.1,value/max*.88):.03;return <div key={`${day}-${hour}`} title={`${day}, ${hour}:00 · ${format(cell)}`} className="flex h-12 items-center justify-center rounded-xl border border-white/[.06] text-[10px] font-black text-white" style={{backgroundColor:`rgba(207,238,237,${alpha})`,color:alpha>.45?'#4c061c':'rgba(255,255,255,.75)'}}>{cell?metric==='orders'?num(cell.orders):metric==='revenue'?money(cell.revenue).replace(' ₴',''):money(cell.averageCheck).replace(' ₴',''):'—'}</div>})}</div>)}</div></div></div></section>
}
