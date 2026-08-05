import React from 'react';
import { money } from './data';

type Cell={weekday:number;hour:number;revenue:number;orders:number};
type Props={
  cells:Cell[];
  selectedHours?:number[];
  selectedWeekdays?:number[];
  onHourClick?:(hour:number)=>void;
  onWeekdayClick?:(weekday:number)=>void;
  onCellClick?:(weekday:number,hour:number)=>void;
};

const OPEN_HOUR=10;
const CLOSE_HOUR=22;
const DAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

export default function Heatmap({cells,selectedHours=[],selectedWeekdays=[],onHourClick,onWeekdayClick,onCellClick}:Props){
  const operatingCells=cells.filter(x=>x.hour>=OPEN_HOUR&&x.hour<=CLOSE_HOUR);
  const max=Math.max(1,...operatingCells.map(x=>x.revenue));
  const hours=Array.from({length:CLOSE_HOUR-OPEN_HOUR+1},(_,i)=>i+OPEN_HOUR);

  return <div className="overflow-x-auto"><div className="min-w-[780px]">
    <div className="mb-3 flex items-center justify-between text-[11px] text-white/40"><span>Натисни годину, день або комірку для cross-filter</span><span className="font-bold text-[#cfeeed]">10:00–22:00</span></div>
    <div className="grid gap-1" style={{gridTemplateColumns:`72px repeat(${hours.length},minmax(44px,1fr))`}}>
      <div/>
      {hours.map(hour=>{const active=selectedHours.includes(hour);return <button type="button" key={hour} onClick={()=>onHourClick?.(hour)} className={`rounded-lg pb-2 pt-1 text-center text-[10px] transition ${active?'bg-[#cfeeed] font-black text-[#531027]':'text-white/40 hover:bg-white/[.06] hover:text-white'}`}>{hour}:00</button>})}
      {DAYS.map((day,index)=>{const weekday=index+1;const dayActive=selectedWeekdays.includes(weekday);return <React.Fragment key={day}>
        <button type="button" onClick={()=>onWeekdayClick?.(weekday)} className={`flex items-center rounded-lg px-2 text-xs font-bold transition ${dayActive?'bg-[#cfeeed] text-[#531027]':'text-white/55 hover:bg-white/[.06] hover:text-white'}`}>{day}</button>
        {hours.map(hour=>{const cell=operatingCells.find(x=>x.weekday===weekday&&x.hour===hour);const intensity=cell?cell.revenue/max:0;const active=selectedWeekdays.includes(weekday)&&selectedHours.includes(hour);return <button type="button" key={hour} onClick={()=>onCellClick?.(weekday,hour)} title={cell?`${day} ${hour}:00 · ${money(cell.revenue)} · ${cell.orders} чеків`:`${day} ${hour}:00 · немає продажів`} aria-label={cell?`${day} ${hour}:00, ${money(cell.revenue)}, ${cell.orders} чеків`:`${day} ${hour}:00, немає продажів`} className={`h-10 rounded-lg border transition hover:scale-[1.06] hover:border-[#cfeeed]/70 focus:outline-none focus:ring-2 focus:ring-[#cfeeed]/70 ${active?'border-[#f3c969] ring-2 ring-[#f3c969]/80':'border-white/[.05]'}`} style={{background:`rgba(207,238,237,${0.04+intensity*0.86})`}}/>})}
      </React.Fragment>})}
    </div>
  </div></div>
}
