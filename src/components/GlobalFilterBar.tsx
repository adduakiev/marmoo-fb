import { useMemo, useState } from 'react';
import { ChevronDown, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { PERIODS, type PeriodKey } from '../sales/data';
import { STANDARD_CHANNELS } from '../sales/channelNames';
import { useFilters } from '../context/FilterContext';

type FilterRoute='dashboard'|'dashboard_sales'|'dashboard_menu'|'dashboard_channels'|'dashboard_executive'|'dashboard_daypart'|'dashboard_weekday'|'dashboard_categories';

const ROUTE_CONFIG:Record<FilterRoute,{period:boolean;channels:boolean;compare:boolean;normalize:boolean;service:boolean;search:boolean;placeholder:string}>={
  dashboard:{period:true,channels:false,compare:false,normalize:false,service:false,search:true,placeholder:'Пошук у відгуках'},
  dashboard_sales:{period:true,channels:true,compare:true,normalize:true,service:true,search:true,placeholder:'Пошук страви або категорії'},
  dashboard_menu:{period:true,channels:false,compare:false,normalize:true,service:true,search:true,placeholder:'Пошук страви або категорії'},
  dashboard_channels:{period:true,channels:true,compare:false,normalize:false,service:false,search:false,placeholder:''},
  dashboard_executive:{period:false,channels:false,compare:false,normalize:false,service:false,search:false,placeholder:''},
  dashboard_daypart:{period:true,channels:false,compare:false,normalize:false,service:false,search:false,placeholder:''},
  dashboard_weekday:{period:true,channels:false,compare:false,normalize:false,service:false,search:false,placeholder:''},
  dashboard_categories:{period:true,channels:false,compare:false,normalize:true,service:true,search:true,placeholder:'Пошук категорії або страви'}
};

const WEEKDAY_LABELS=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

export default function GlobalFilterBar({route}:{route:FilterRoute}) {
  const { filters, setFilters, toggleChannel, toggleCategory, toggleProduct, toggleDate, toggleHour, toggleWeekday, clearCrossFilters, resetFilters } = useFilters();
  const [open,setOpen]=useState(false);
  const config=ROUTE_CONFIG[route];
  const setPeriod = (period: PeriodKey) => setFilters(prev => ({ ...prev, period }));
  const hasSecondary=config.channels||config.compare||config.normalize||config.service;
  const periodLabel=PERIODS.find(item=>item.key===filters.period)?.label||'Період';
  const crossCount=filters.selectedChannels.length+filters.selectedCategories.length+filters.selectedProducts.length+filters.selectedDates.length+filters.selectedHours.length+filters.selectedWeekdays.length;
  const activeCount=crossCount+(filters.compareLFL?1:0)+(filters.normalizeProducts?1:0)+(filters.hideServiceItems?1:0)+(filters.searchQuery?1:0);
  const summary=useMemo(()=>{
    const parts:string[]=[];
    if(config.period)parts.push(periodLabel);
    if(filters.selectedChannels.length)parts.push(`${filters.selectedChannels.length} каналів`);else if(config.channels)parts.push('Усі канали');
    if(filters.selectedCategories.length)parts.push(`${filters.selectedCategories.length} категорій`);
    if(filters.selectedProducts.length)parts.push(`${filters.selectedProducts.length} страв`);
    if(filters.selectedDates.length)parts.push(`${filters.selectedDates.length} дат`);
    if(filters.selectedWeekdays.length)parts.push(`${filters.selectedWeekdays.length} днів тижня`);
    if(filters.selectedHours.length)parts.push(`${filters.selectedHours.length} годин`);
    if(config.normalize&&filters.normalizeProducts)parts.push('Дублікати об’єднано');
    if(config.service&&filters.hideServiceItems)parts.push('Технічні приховано');
    if(config.compare&&filters.compareLFL)parts.push('Є порівняння');
    if(config.search&&filters.searchQuery)parts.push(`Пошук: ${filters.searchQuery}`);
    return parts.join(' · ');
  },[config,periodLabel,filters]);

  if(!config.period&&!config.search&&!hasSecondary&&crossCount===0)return null;

  const chips=[
    ...filters.selectedChannels.map(value=>({key:`channel:${value}`,label:value,onRemove:()=>toggleChannel(value)})),
    ...filters.selectedCategories.map(value=>({key:`category:${value}`,label:value,onRemove:()=>toggleCategory(value)})),
    ...filters.selectedProducts.map(value=>({key:`product:${value}`,label:value,onRemove:()=>toggleProduct(value)})),
    ...filters.selectedDates.map(value=>({key:`date:${value}`,label:value,onRemove:()=>toggleDate(value)})),
    ...filters.selectedWeekdays.map(value=>({key:`weekday:${value}`,label:WEEKDAY_LABELS[value-1]||`День ${value}`,onRemove:()=>toggleWeekday(value)})),
    ...filters.selectedHours.map(value=>({key:`hour:${value}`,label:`${String(value).padStart(2,'0')}:00`,onRemove:()=>toggleHour(value)}))
  ];

  return (
    <div className="sticky top-16 z-[100] border-b border-white/10 bg-[#3f0417]/95 px-3 py-2 text-white backdrop-blur-xl md:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="global-filter-panel" className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2.5 text-left transition hover:bg-white/[.065]">
            <span className="flex min-w-0 items-center gap-2.5"><span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cfeeed]/10 text-[#cfeeed]"><SlidersHorizontal size={15}/>{activeCount>0&&<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#cfeeed] px-1 text-[9px] font-black text-[#531027]">{activeCount}</span>}</span><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[.15em] text-[#cfeeed]/55">Фільтри</span><span className="block truncate text-xs font-bold text-white/68 sm:text-sm">{summary||'Немає активних фільтрів'}</span></span></span>
            <ChevronDown size={17} className={`shrink-0 text-white/45 transition-transform ${open?'rotate-180':''}`}/>
          </button>
          <button type="button" onClick={resetFilters} title="Скинути фільтри" className="inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.035] text-white/55 transition hover:bg-white/[.08] hover:text-white"><RotateCcw size={16}/><span className="sr-only">Скинути фільтри</span></button>
        </div>

        {chips.length>0&&<div className="mt-2 flex gap-2 overflow-x-auto pb-1">{chips.map(chip=><button key={chip.key} type="button" onClick={chip.onRemove} className="inline-flex min-w-max items-center gap-1.5 rounded-full border border-[#cfeeed]/25 bg-[#cfeeed]/10 px-3 py-1.5 text-[11px] font-black text-[#d8f4f2]"><span>{chip.label}</span><X size={12}/></button>)}<button type="button" onClick={clearCrossFilters} className="min-w-max rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-black text-white/45 hover:text-white">Очистити вибір</button></div>}

        {open&&<div id="global-filter-panel" className="mt-2 rounded-2xl border border-white/10 bg-black/10 p-3 shadow-[0_18px_45px_rgba(25,0,9,.18)] md:p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#cfeeed]/55"><Filter size={14}/>Налаштування звіту</div><button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-white/50 hover:bg-white/[.06] hover:text-white"><RotateCcw size={13}/>Скинути</button></div>
          {config.period&&<div className="mb-3 flex gap-2 overflow-x-auto pb-1">{PERIODS.map(item=><button key={item.key} type="button" onClick={()=>setPeriod(item.key)} className={`min-w-max rounded-xl border px-3 py-2 text-xs font-black transition ${filters.period===item.key?'border-[#cfeeed] bg-[#cfeeed] text-[#531027]':'border-white/10 bg-white/[.04] text-white/65 hover:bg-white/[.08] hover:text-white'}`}>{item.label}</button>)}</div>}
          {hasSecondary&&<div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">{config.channels?<div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">{STANDARD_CHANNELS.map(channel=>{const selected=filters.selectedChannels.includes(channel);return <button key={channel} type="button" onClick={()=>toggleChannel(channel)} className={`min-w-max rounded-lg border px-3 py-2 text-xs font-bold transition ${selected?'border-[#cfeeed]/70 bg-[#cfeeed]/15 text-[#d8f4f2]':'border-white/10 bg-black/10 text-white/55 hover:text-white'}`}>{channel}</button>})}</div>:<div/>}{config.compare&&<label className="flex min-w-max items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.compareLFL} onChange={e=>setFilters(prev=>({...prev,compareLFL:e.target.checked}))}/>Порівнювати з минулим періодом</label>}{config.normalize&&<label className="flex min-w-max items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.normalizeProducts} onChange={e=>setFilters(prev=>({...prev,normalizeProducts:e.target.checked}))}/>Об’єднувати дублікати страв</label>}{config.service&&<label className="flex min-w-max items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.hideServiceItems} onChange={e=>setFilters(prev=>({...prev,hideServiceItems:e.target.checked}))}/>Приховати технічні позиції</label>}</div>}
          {config.search&&<label className="relative mt-3 block max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={16}/><input value={filters.searchQuery} onChange={e=>setFilters(prev=>({...prev,searchQuery:e.target.value}))} placeholder={config.placeholder} className="w-full rounded-xl border border-white/10 bg-black/15 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#cfeeed]/50"/></label>}
        </div>}
      </div>
    </div>
  );
}
