import React from 'react';
import { money } from './data';

type Cell={weekday:number;hour:number;revenue:number;orders:number};

export default function Heatmap({cells}:{cells:Cell[]}){
  const max=Math.max(1,...cells.map(x=>x.revenue));
  const days=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const hours=Array.from({length:15},(_,i)=>i+8);
  return <div className="overflow-x-auto"><div className="min-w-[900px]"><div className="grid gap-1" style={{gridTemplateColumns:'72px repeat(15,minmax(44px,1fr))'}}><div/>{hours.map(h=><div key={h} className="pb-2 text-center text-[10px] text-white/40">{h}:00</div>)}{days.map((day,di)=><React.Fragment key={day}><div className="flex items-center text-xs font-bold text-white/55">{day}</div>{hours.map(h=>{const c=cells.find(x=>x.weekday===di+1&&x.hour===h);const intensity=c?c.revenue/max:0;return <div key={h} title={c?`${day} ${h}:00 · ${money(c.revenue)} · ${c.orders} чеків`:`${day} ${h}:00`} className="h-10 rounded-lg border border-white/[.05]" style={{background:`rgba(207,238,237,${0.04+intensity*0.86})`}}/>})}</React.Fragment>)}</div></div></div>
}
