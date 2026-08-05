import {useEffect,type ReactNode} from 'react';
import {ArrowRight, X} from 'lucide-react';

type Metric={label:string;value:string;hint?:string};

type Props={
  open:boolean;
  eyebrow?:string;
  title:string;
  subtitle?:string;
  metrics?:Metric[];
  children?:ReactNode;
  actionLabel?:string;
  onAction?:()=>void;
  onClose:()=>void;
};

export default function DrilldownDrawer({open,eyebrow='DRILL-DOWN',title,subtitle,metrics=[],children,actionLabel,onAction,onClose}:Props){
  useEffect(()=>{
    if(!open)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
    document.addEventListener('keydown',onKey);
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previous};
  },[open,onClose]);

  if(!open)return null;
  return <div className="fixed inset-0 z-[250]">
    <button aria-label="Закрити панель" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"/>
    <aside role="dialog" aria-modal="true" aria-label={title} className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-[linear-gradient(180deg,#5b0b25_0%,#390313_100%)] text-white shadow-[-25px_0_70px_rgba(0,0,0,.38)]">
      <div className="border-b border-white/10 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#cfeeed]/50">{eyebrow}</p><h2 className="mt-2 text-2xl font-black text-[#d8f4f2] md:text-3xl">{title}</h2>{subtitle&&<p className="mt-2 text-sm text-white/55">{subtitle}</p>}</div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-white/65 transition hover:bg-white/[.1] hover:text-white"><X size={18}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        {metrics.length>0&&<div className="grid gap-3 sm:grid-cols-2">{metrics.map(item=><div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><p className="text-[10px] font-black uppercase tracking-[.13em] text-white/40">{item.label}</p><div className="mt-2 text-xl font-black text-[#d8f4f2]">{item.value}</div>{item.hint&&<p className="mt-1 text-xs text-white/40">{item.hint}</p>}</div>)}</div>}
        {children&&<div className="mt-5">{children}</div>}
      </div>
      {actionLabel&&onAction&&<div className="border-t border-white/10 p-5 md:p-6"><button onClick={onAction} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#cfeeed] px-4 py-3 text-sm font-black text-[#531027] transition hover:brightness-105">{actionLabel}<ArrowRight size={16}/></button></div>}
    </aside>
  </div>;
}
