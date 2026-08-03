import React from 'react';
import { money } from './data';

type Cell={weekday:number;hour:number;revenue:number;orders:number};

const OPEN_HOUR=10;
const CLOSE_HOUR=22;

export default function Heatmap({cells}:{cells:Cell[]}){
  const operatingCells=cells.filter(x=>x.hour>=OPEN_HOUR&&x.hour<=CLOSE_HOUR);
  const max=Math.max(1,...operatingCells.map(x=>x.revenue));
  const days=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const hours=Array.from({length:CLOSE_HOUR-OPEN_HOUR+1},(_,i)=>i+OPEN_HOUR);
  return <div className="overflow-x-auto"><div className="min-w-[780px]"><div className="mb-3 flex items-center justify-between text-[11px] text-white/40"><span>Робочі години MARMOO</span><span className="font-bold text-[#cfeeed]">10:00–22:00</span></div><div className="grid gap-1" style={{gridTemplateColumns:`72px repeat(${hours.length},minmax(44px,1fr))`}}><div/>{hours.map(h=><div key={h} className="pb-2 text-center text-[10px] text-white/40">{h}:00</div>)}{days.map((day,di)=><React.Fragment key={day}><div className="flex items-center text-xs font-bold text-white/55">{day}</div>{hours.map(h=>{const c=operatingCells.find(x=>x.weekday===di+1&&x.hour===h);const intensity=c?c.revenue/max:0;return <div key={h} title={c?`${day} ${h}:00 · ${money(c.revenue)} · ${c.orders} чеків`:`${day} ${h}:00 · немає продажів`} className="h-10 rounded-lg border border-white/[.05]" style={{background:`rgba(207,238,237,${0.04+intensity*0.86})`}}/>})}</React.Fragment>)}</div></div></div>
}
