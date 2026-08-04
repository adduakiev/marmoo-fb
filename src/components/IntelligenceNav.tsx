import { BarChart3, MessageSquareText, Radio, UtensilsCrossed } from 'lucide-react';

type IntelligenceRoute = 'dashboard' | 'dashboard_sales' | 'dashboard_menu' | 'dashboard_channels';

const items = [
  { key: 'dashboard' as const, label: 'Відгуки', href: '#dashboard', icon: MessageSquareText },
  { key: 'dashboard_sales' as const, label: 'Sales BI', href: '#dashboard_sales', icon: BarChart3 },
  { key: 'dashboard_menu' as const, label: 'Menu Intelligence', href: '#dashboard_menu', icon: UtensilsCrossed },
  { key: 'dashboard_channels' as const, label: 'Channel Intelligence', href: '#dashboard_channels', icon: Radio },
];

export default function IntelligenceNav({ active }: { active: IntelligenceRoute }) {
  return (
    <div className="sticky top-0 z-[100] border-b border-white/10 bg-[#4c061c]/95 px-3 py-3 text-white shadow-[0_12px_35px_rgba(31,0,11,.28)] backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#cfeeed] font-black text-[#531027]">M</div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.24em] text-[#cfeeed]/55">MARMOO</div>
            <div className="text-base font-black text-[#d8f4f2]">Intelligence Hub</div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {items.map(({ key, label, href, icon: Icon }) => {
            const selected = active === key;
            return (
              <a
                key={key}
                href={href}
                className={`inline-flex min-w-max items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                  selected
                    ? 'border-[#cfeeed] bg-[#cfeeed] text-[#531027]'
                    : 'border-white/10 bg-white/[.05] text-white/65 hover:border-white/25 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
