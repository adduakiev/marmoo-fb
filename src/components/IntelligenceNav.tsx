import { useEffect, useState } from 'react';
import {
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Clock3,
  Layers3,
  Menu,
  MessageSquareText,
  Radio,
  UtensilsCrossed,
  X,
} from 'lucide-react';

type IntelligenceRoute =
  | 'dashboard'
  | 'dashboard_sales'
  | 'dashboard_menu'
  | 'dashboard_channels'
  | 'dashboard_executive'
  | 'dashboard_daypart'
  | 'dashboard_weekday'
  | 'dashboard_categories';

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
  const [open, setOpen] = useState(false);
  const activeItem = items.find(item => item.key === active) ?? items[0];

  useEffect(() => setOpen(false), [active]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[110] border-b border-white/10 bg-[#4c061c]/95 px-3 text-white shadow-[0_10px_28px_rgba(31,0,11,.24)] backdrop-blur-xl md:px-6">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3">
          <a href="#dashboard_executive" className="flex min-w-0 items-center gap-3" aria-label="MARMOO — головна сторінка аналітики">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#cfeeed] text-sm font-black text-[#531027]">M</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight text-[#d8f4f2] sm:text-base">MARMOO · Аналітичний центр</div>
              <div className="truncate text-[10px] font-bold uppercase tracking-[.16em] text-white/40">{activeItem.label}</div>
            </div>
          </a>

          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            aria-expanded={open}
            aria-controls="marmoo-intelligence-menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-[#d8f4f2] transition hover:border-white/25 hover:bg-white/[.09]"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
            <span className="sr-only">Меню розділів</span>
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[105] bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav
            id="marmoo-intelligence-menu"
            aria-label="Розділи аналітики"
            onClick={event => event.stopPropagation()}
            className="absolute right-3 top-[72px] w-[min(92vw,360px)] rounded-3xl border border-white/12 bg-[#3f0417]/98 p-3 text-white shadow-[0_24px_70px_rgba(25,0,9,.55)] md:right-6"
          >
            <div className="mb-2 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#cfeeed]/50">Розділи аналітики</div>
            <div className="grid gap-1.5">
              {items.map(({ key, label, href, icon: Icon }) => {
                const selected = active === key;
                return (
                  <a
                    key={key}
                    href={href}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-black transition ${
                      selected
                        ? 'border-[#cfeeed] bg-[#cfeeed] text-[#531027] shadow-[0_8px_24px_rgba(207,238,237,.14)]'
                        : 'border-transparent bg-white/[.035] text-white/70 hover:border-white/12 hover:bg-white/[.08] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3"><Icon size={17} />{label}</span>
                    {selected && <span className="rounded-full bg-[#531027]/10 px-2 py-1 text-[9px] uppercase tracking-[.12em]">Відкрито</span>}
                  </a>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
