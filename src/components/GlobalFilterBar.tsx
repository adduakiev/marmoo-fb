import { Filter, RotateCcw, Search } from 'lucide-react';
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

export default function GlobalFilterBar({route}:{route:FilterRoute}) {
  const { filters, setFilters, toggleChannel, resetFilters } = useFilters();
  const config=ROUTE_CONFIG[route];
  const setPeriod = (period: PeriodKey) => setFilters(prev => ({ ...prev, period }));
  const hasSecondary=config.channels||config.compare||config.normalize||config.service;
  if(!config.period&&!config.search&&!hasSecondary)return null;

  return (
    <div className="sticky top-[74px] z-[90] border-b border-white/10 bg-[#3f0417]/95 px-3 py-3 text-white backdrop-blur-xl md:px-6">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#cfeeed]/65"><Filter size={15}/>Фільтри звіту</div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/65 hover:bg-white/[.08] hover:text-white"><RotateCcw size={14}/>Скинути</button>
        </div>
        {config.period&&<div className="flex gap-2 overflow-x-auto pb-1">{PERIODS.map(item=><button key={item.key} type="button" onClick={()=>setPeriod(item.key)} className={`min-w-max rounded-xl border px-3.5 py-2 text-xs font-black transition ${filters.period===item.key?'border-[#cfeeed] bg-[#cfeeed] text-[#531027]':'border-white/10 bg-white/[.04] text-white/65 hover:bg-white/[.08] hover:text-white'}`}>{item.label}</button>)}</div>}
        {hasSecondary&&<div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
          {config.channels?<div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">{STANDARD_CHANNELS.map(channel=>{const selected=filters.selectedChannels.includes(channel);return <button key={channel} type="button" onClick={()=>toggleChannel(channel)} className={`min-w-max rounded-lg border px-3 py-2 text-xs font-bold transition ${selected?'border-[#cfeeed]/70 bg-[#cfeeed]/15 text-[#d8f4f2]':'border-white/10 bg-black/10 text-white/55 hover:text-white'}`}>{channel}</button>})}</div>:<div/>}
          {config.compare&&<label className="flex min-w-max items-center gap-2 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.compareLFL} onChange={e=>setFilters(prev=>({...prev,compareLFL:e.target.checked}))}/>Порівнювати з минулим періодом</label>}
          {config.normalize&&<label className="flex min-w-max items-center gap-2 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.normalizeProducts} onChange={e=>setFilters(prev=>({...prev,normalizeProducts:e.target.checked}))}/>Об’єднувати дублікати страв</label>}
          {config.service&&<label className="flex min-w-max items-center gap-2 text-xs font-bold text-white/65"><input type="checkbox" checked={filters.hideServiceItems} onChange={e=>setFilters(prev=>({...prev,hideServiceItems:e.target.checked}))}/>Приховати технічні позиції</label>}
        </div>}
        {config.search&&<label className="relative block max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={16}/><input value={filters.searchQuery} onChange={e=>setFilters(prev=>({...prev,searchQuery:e.target.value}))} placeholder={config.placeholder} className="w-full rounded-xl border border-white/10 bg-black/15 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#cfeeed]/50"/></label>}
      </div>
    </div>
  );
}
