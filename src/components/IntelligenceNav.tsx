import { BarChart3, BrainCircuit, CalendarDays, Clock3, Layers3, MessageSquareText, Radio, UtensilsCrossed } from 'lucide-react';

type IntelligenceRoute = 'dashboard' | 'dashboard_sales' | 'dashboard_menu' | 'dashboard_channels' | 'dashboard_executive' | 'dashboard_daypart' | 'dashboard_weekday' | 'dashboard_categories';

const items = [
  { key: 'dashboard_executive' as const, label: 'Головна', href: '#dashboard_executive', icon: BrainCircuit },
  { key: 'dashboard_sales' as const, label: 'Продажі', href: '#dashboard_sales', icon: BarChart3 },
  { key: 'dashboard_menu' as const, label: 'Страви', href: '#dashboard_menu', icon: UtensilsCrossed },
  { key: 'dashboard_categories' as const, label: 'Категорії', href: '#dashboard_categories', icon: Layers3 },
  { key: 'dashboard_channels' as const, label: 'Канали', href: '#dashboard_channels', icon: Radio },
  { key: 'dashboard_daypart' as const, label: 'Години', href: '#dashboard_daypart', icon: Clock3 },
  { key: 'dashboard_weekday' as const, label: 'Дні тижня', href: '#dashboard_weekday', icon: CalendarDays },
  { key: 'dashboard' as const, label: 'Відгуки', href: '#dashboard', icon: MessageSquareText },
];

export default function IntelligenceNav({ active }: { active: IntelligenceRoute }) {
  return (
    <div className="sticky top-0 z-[100] border-b border-white/10 bg-[#4c061c]/95 px-3 py-3 text-white shadow-[0_12px_35px_rgba(31,0,11,.28)] backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-max items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#cfeeed] font-black text-[#531027]">M</div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.24em] text-[#cfeeed]/55">MARMOO</div>
            <div className="text-base font-black text-[#d8f4f2]">Аналітичний центр</div>
          </div>
        </div>
        <nav aria-label="Розділи аналітики" className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {items.map(({ key, label, href, icon: Icon }) => {
            const selected = active === key;
            return <a key={key} href={href} aria-current={selected?'page':undefined} className={`inline-flex min-w-max items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${selected?'border-[#cfeeed] bg-[#cfeeed] text-[#531027] shadow-[0_8px_24px_rgba(207,238,237,.16)]':'border-white/10 bg-white/[.05] text-white/65 hover:border-white/25 hover:bg-white/[.08] hover:text-white'}`}><Icon size={16}/>{label}</a>;
          })}
        </nav>
      </div>
    </div>
  );
}
