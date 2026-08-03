import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  CreditCard,
  Flame,
  Layers3,
  PackageSearch,
  RefreshCw,
  ShoppingBasket,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DailyPoint = {
  date: string;
  revenue: number;
  orders: number;
  averageCheck: number;
  markup: number;
};

type ChannelPoint = {
  channel: string;
  revenue: number;
  orders: number;
  averageCheck: number;
  markupPercent: number;
};

type HourPoint = {
  hour: number;
  revenue: number;
  orders: number;
  averageCheck: number;
};

type ProductPoint = {
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  markup: number;
  markupPercent: number;
};

type SalesPayload = {
  updatedAt: string;
  period: { from: string; to: string };
  summary: {
    revenue: number;
    orders: number;
    averageCheck: number;
    markup: number;
    cost: number;
    markupPercent: number;
    identifiedOrders: number;
    identifiedCustomers: number;
  };
  daily: DailyPoint[];
  channels: ChannelPoint[];
  hourly: HourPoint[];
  products: ProductPoint[];
};

type PeriodKey = '7' | '14' | '30' | 'all';

const SALES_DATA_URL = `${import.meta.env.BASE_URL || '/'}sales-data.json`;

const money = (value: number) =>
  `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value || 0)} ₴`;

const number = (value: number) =>
  new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value || 0);

const percent = (value: number) => `${(value || 0).toFixed(1)}%`;

const dateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '—';
  return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short' }).format(date);
};

const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid rgba(209,242,240,.18)',
  background: 'rgba(48,5,22,.97)',
  color: '#fffaf7',
  boxShadow: '0 20px 50px rgba(20,0,8,.35)',
};

function delta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function aggregateDaily(rows: DailyPoint[]) {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const markup = rows.reduce((sum, row) => sum + row.markup, 0);
  return {
    revenue,
    orders,
    averageCheck: orders ? revenue / orders : 0,
    markup,
    cost: revenue - markup,
    markupPercent: revenue ? (markup / revenue) * 100 : 0,
  };
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs opacity-45">немає бази порівняння</span>;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${positive ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {positive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  change,
  icon: Icon,
  tone = 'light',
}: {
  label: string;
  value: string;
  helper: string;
  change?: number | null;
  icon: React.ElementType;
  tone?: 'light' | 'mint' | 'dark';
}) {
  const classes = {
    light: 'bg-[#f6eee8] text-[#5b0b25] border-white/60',
    mint: 'bg-[#cfeeed] text-[#531027] border-white/60',
    dark: 'bg-white/[0.06] text-white border-white/10',
  }[tone];

  return (
    <div className={`rounded-[26px] border p-5 ${classes}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] opacity-60 font-bold">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-white/35 flex items-center justify-center border border-white/35">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-[32px] leading-none font-black tracking-[-0.04em]">{value}</div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs opacity-65">{helper}</span>
        {change !== undefined && <DeltaBadge value={change} />}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = '' }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-white/10 bg-white/[0.055] p-5 md:p-7 backdrop-blur-xl ${className}`}>
      <div className="mb-5">
        <h2 className="text-xl md:text-2xl font-black tracking-[-0.03em] text-[#d8f4f2]">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-white/48">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <div className="min-h-screen bg-[#4d071e] text-white flex items-center justify-center px-5">
      <div className="max-w-xl w-full rounded-[32px] border border-white/10 bg-white/[0.06] p-10 text-center">
        <PackageSearch className="mx-auto text-[#cfeeed]" size={42} />
        <h1 className="mt-6 text-4xl font-black text-[#d8f4f2]">Немає snapshot</h1>
        <button onClick={onReload} className="mt-7 rounded-2xl bg-[#cfeeed] px-5 py-3 font-bold text-[#5b0b25]">
          Перевірити ще раз
        </button>
      </div>
    </div>
  );
}

export default function SalesDashboard() {
  const [data, setData] = useState<SalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('7');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SALES_DATA_URL}?_=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(await response.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedDaily = useMemo(() => {
    if (!data) return [];
    if (period === 'all') return data.daily;
    return data.daily.slice(-Number(period));
  }, [data, period]);

  const previousDaily = useMemo(() => {
    if (!data || period === 'all') return [];
    const size = Number(period);
    return data.daily.slice(-(size * 2), -size);
  }, [data, period]);

  const current = useMemo(() => aggregateDaily(selectedDaily), [selectedDaily]);
  const previous = useMemo(() => aggregateDaily(previousDaily), [previousDaily]);

  const comparisons = {
    revenue: period === 'all' ? null : delta(current.revenue, previous.revenue),
    orders: period === 'all' ? null : delta(current.orders, previous.orders),
    averageCheck: period === 'all' ? null : delta(current.averageCheck, previous.averageCheck),
    markup: period === 'all' ? null : delta(current.markup, previous.markup),
  };

  const topProducts = useMemo(() => {
    if (!data) return [];
    return [...data.products].sort((a, b) => b.revenue - a.revenue).slice(0, 7);
  }, [data]);

  const hourPeak = useMemo(() => {
    if (!data?.hourly.length) return null;
    return [...data.hourly].sort((a, b) => b.revenue - a.revenue)[0];
  }, [data]);

  const channelTotal = useMemo(() => data?.channels.reduce((sum, item) => sum + item.revenue, 0) || 0, [data]);

  const insights = useMemo(() => {
    if (!data) return [];
    const bestDay = [...selectedDaily].sort((a, b) => b.revenue - a.revenue)[0];
    const bestChannel = data.channels[0];
    const bestProduct = topProducts[0];
    return [
      comparisons.revenue === null ? null : `Оборот ${comparisons.revenue >= 0 ? 'виріс' : 'знизився'} на ${Math.abs(comparisons.revenue).toFixed(1)}% проти попереднього періоду.`,
      comparisons.averageCheck === null ? null : `Середній чек ${comparisons.averageCheck >= 0 ? 'виріс' : 'знизився'} на ${Math.abs(comparisons.averageCheck).toFixed(1)}%.`,
      bestDay ? `Найкращий день у вибраному періоді — ${dateLabel(bestDay.date)}: ${money(bestDay.revenue)}.` : null,
      hourPeak ? `Пікова година — ${hourPeak.hour}:00, оборот ${money(hourPeak.revenue)}.` : null,
      bestChannel ? `Найбільший канал — ${bestChannel.channel}: ${money(bestChannel.revenue)}.` : null,
      bestProduct ? `Топ-страва за оборотом — ${bestProduct.productName}: ${money(bestProduct.revenue)}.` : null,
    ].filter(Boolean) as string[];
  }, [data, selectedDaily, topProducts, hourPeak, comparisons.revenue, comparisons.averageCheck]);

  if (loading) {
    return <div className="min-h-screen bg-[#4d071e] text-white flex items-center justify-center"><RefreshCw className="animate-spin" /></div>;
  }
  if (!data) return <EmptyState onReload={loadData} />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#7d1640_0%,#580822_34%,#3c0417_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-9">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-7">
          <div>
            <div className="flex items-center gap-3 text-[#cfeeed]">
              <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center"><BarChart3 size={23} /></div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">MARMOO Intelligence</p>
                <h1 className="text-4xl md:text-5xl font-black tracking-[-0.055em]">Sales BI</h1>
              </div>
            </div>
            <p className="mt-4 text-white/50 text-sm">Олімпійська · Велика Васильківська, 57/3 · {dateLabel(data.period.from)} — {dateLabel(data.period.to)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['7', '14', '30', 'all'] as PeriodKey[]).map((key) => (
              <button key={key} onClick={() => setPeriod(key)} className={`rounded-xl px-4 py-2.5 text-sm font-bold border transition ${period === key ? 'bg-[#cfeeed] text-[#5b0b25] border-[#cfeeed]' : 'bg-white/[0.05] border-white/10 text-white/65'}`}>
                {key === 'all' ? 'Весь період' : `${key} днів`}
              </button>
            ))}
            <button onClick={loadData} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-white/70"><RefreshCw size={17} /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-5">
          <MetricCard label="Оборот" value={money(current.revenue)} helper="обраний період" change={comparisons.revenue} icon={TrendingUp} tone="mint" />
          <MetricCard label="Чеки" value={number(current.orders)} helper="завершені замовлення" change={comparisons.orders} icon={CreditCard} />
          <MetricCard label="Середній чек" value={money(current.averageCheck)} helper="оборот / чеки" change={comparisons.averageCheck} icon={ShoppingBasket} />
          <MetricCard label="Націнка" value={money(current.markup)} helper={percent(current.markupPercent)} change={comparisons.markup} icon={Flame} tone="mint" />
          <MetricCard label="Собівартість" value={money(current.cost)} helper="розрахункова" icon={Layers3} />
          <MetricCard label="Клієнти" value={number(data.summary.identifiedCustomers)} helper={`${number(data.summary.identifiedOrders)} чеків із телефоном`} icon={Users} tone="dark" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Panel title="Динаміка продажів" subtitle="Оборот по днях" className="xl:col-span-8">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedDaily}>
                  <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cfeeed" stopOpacity={0.72} /><stop offset="100%" stopColor="#cfeeed" stopOpacity={0.03} /></linearGradient></defs>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} labelFormatter={dateLabel} />
                  <Area type="monotone" dataKey="revenue" stroke="#cfeeed" strokeWidth={3} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Що змінилось" subtitle="Автоматичне резюме" className="xl:col-span-4">
            <div className="space-y-3">
              {insights.map((item, index) => (
                <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-relaxed text-white/72">
                  <span className="mr-2 text-[#cfeeed] font-black">{index + 1}.</span>{item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Канали продажів" subtitle="Частка обороту" className="xl:col-span-5">
            <div className="space-y-5">
              {data.channels.map((item) => {
                const share = channelTotal ? (item.revenue / channelTotal) * 100 : 0;
                return (
                  <div key={item.channel}>
                    <div className="mb-2 flex items-end justify-between gap-4">
                      <div className="flex items-center gap-2 text-white/78">{item.channel === 'Зал' ? <Store size={15} /> : <Truck size={15} />}<span className="font-semibold">{item.channel}</span></div>
                      <div className="text-right"><div className="font-black text-[#cfeeed]">{money(item.revenue)}</div><div className="text-xs text-white/40">{share.toFixed(1)}% · {number(item.orders)} чеків</div></div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#cfeeed]" style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Години попиту" subtitle={hourPeak ? `Пік: ${hourPeak.hour}:00 · ${money(hourPeak.revenue)}` : ''} className="xl:col-span-7">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly}>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} />
                  <Bar dataKey="revenue" fill="#cfeeed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Топ страв" subtitle="За оборотом" className="xl:col-span-12">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-[0.16em] text-white/35 border-b border-white/10"><th className="pb-4">#</th><th className="pb-4">Страва</th><th className="pb-4">Категорія</th><th className="pb-4 text-right">Кількість</th><th className="pb-4 text-right">Оборот</th><th className="pb-4 text-right">Націнка</th></tr></thead>
                <tbody>{topProducts.map((item, index) => (
                  <tr key={`${item.productCode}-${index}`} className="border-b border-white/[0.07] hover:bg-white/[0.035]"><td className="py-4 text-[#cfeeed] font-black">{index + 1}</td><td className="py-4 font-semibold text-white/90">{item.productName}</td><td className="py-4 text-white/42">{item.category}</td><td className="py-4 text-right text-white/65">{number(item.quantity)}</td><td className="py-4 text-right font-black text-[#cfeeed]">{money(item.revenue)}</td><td className="py-4 text-right text-white/65">{percent(item.markupPercent)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
        </div>

        <footer className="mt-7 flex flex-col md:flex-row gap-3 md:items-center justify-between text-xs text-white/28">
          <div className="flex items-center gap-2"><CalendarDays size={14} /> Snapshot: {new Date(data.updatedAt).toLocaleString('uk-UA')}</div>
          <div className="flex items-center gap-2"><Activity size={14} /> MARMOO Sales Intelligence v2</div>
        </footer>
      </div>
    </div>
  );
}
