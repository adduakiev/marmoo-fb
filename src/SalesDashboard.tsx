import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Coffee,
  CreditCard,
  Flame,
  Layers3,
  PackageSearch,
  RefreshCw,
  ShoppingBasket,
  Store,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

const SALES_DATA_URL = `${import.meta.env.BASE_URL || '/'}sales-data.json`;

const money = (value: number) =>
  new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 0,
  }).format(value || 0) + ' ₴';

const number = (value: number) =>
  new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 0,
  }).format(value || 0);

const percent = (value: number) => `${(value || 0).toFixed(1)}%`;

const dateLabel = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const tooltipStyle = {
  borderRadius: 18,
  border: '1px solid rgba(209, 242, 240, 0.18)',
  background: 'rgba(48, 5, 22, 0.96)',
  color: '#fffaf7',
  boxShadow: '0 22px 50px rgba(20, 0, 8, 0.35)',
  backdropFilter: 'blur(18px)',
};

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'light',
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
  tone?: 'light' | 'mint' | 'dark';
}) {
  const classes = {
    light: 'bg-[#f6eee8] text-[#5b0b25] border-white/60',
    mint: 'bg-[#cfeeed] text-[#531027] border-white/60',
    dark: 'bg-white/[0.06] text-white border-white/10',
  }[tone];

  return (
    <div className={`rounded-[28px] border p-5 md:p-6 ${classes} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] opacity-60 font-semibold">{label}</p>
          <div className="mt-4 text-3xl md:text-[38px] leading-none font-black tracking-[-0.04em]">{value}</div>
          <p className="mt-3 text-sm opacity-70">{helper}</p>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-white/40 flex items-center justify-center border border-white/40">
          <Icon size={21} strokeWidth={2.1} />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[30px] border border-white/10 bg-white/[0.055] p-5 md:p-7 shadow-[0_24px_80px_rgba(15,0,6,0.18)] backdrop-blur-xl ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-black tracking-[-0.03em] text-[#d8f4f2]">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-white/55">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="max-w-2xl w-full rounded-[36px] border border-white/10 bg-white/[0.06] p-8 md:p-12 text-center backdrop-blur-xl shadow-[0_35px_100px_rgba(10,0,5,0.35)]">
        <div className="mx-auto h-16 w-16 rounded-[22px] bg-[#cfeeed] text-[#5b0b25] flex items-center justify-center">
          <PackageSearch size={30} />
        </div>
        <h1 className="mt-7 text-3xl md:text-5xl font-black tracking-[-0.05em] text-[#d8f4f2]">Sales BI готовий до даних</h1>
        <p className="mt-5 text-base md:text-lg text-white/65 leading-relaxed">
          Каркас сторінки вже підключений. Наступний технічний крок — сформувати snapshot <code className="text-[#cfeeed]">sales-data.json</code> із листів BI_ORDERS та BI_ORDER_ITEMS.
        </p>
        <button
          onClick={onReload}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#cfeeed] px-5 py-3 font-bold text-[#5b0b25] transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw size={18} /> Перевірити snapshot
        </button>
      </div>
    </div>
  );
}

export default function SalesDashboard() {
  const [data, setData] = useState<SalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState('Усі канали');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SALES_DATA_URL}?_=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as SalesPayload;
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити дані');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredChannels = useMemo(() => {
    if (!data) return [];
    return channel === 'Усі канали'
      ? data.channels
      : data.channels.filter((item) => item.channel === channel);
  }, [data, channel]);

  const topProducts = useMemo(() => {
    if (!data) return [];
    return [...data.products].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [data]);

  const hourPeak = useMemo(() => {
    if (!data?.hourly?.length) return null;
    return [...data.hourly].sort((a, b) => b.revenue - a.revenue)[0];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#4d071e] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/70">
          <RefreshCw size={20} className="animate-spin" /> Завантажую Sales BI…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#7d1640_0%,#580822_34%,#3c0417_100%)] text-white">
        <EmptyState onReload={loadData} />
        {error && <p className="pb-8 text-center text-xs text-white/35">Технічний статус: {error}</p>}
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#7d1640_0%,#580822_34%,#3c0417_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-9">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 text-[#cfeeed]">
              <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center">
                <BarChart3 size={23} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">MARMOO Intelligence</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-[-0.055em]">Sales BI</h1>
              </div>
            </div>
            <p className="mt-4 text-white/55 text-sm md:text-base">
              Олімпійська · Велика Васильківська, 57/3 · {dateLabel(data.period.from)} — {dateLabel(data.period.to)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="appearance-none rounded-2xl border border-white/10 bg-white/[0.07] py-3 pl-4 pr-10 text-sm font-semibold text-white outline-none focus:border-[#cfeeed]/50"
              >
                <option className="bg-[#4d071e]">Усі канали</option>
                {data.channels.map((item) => (
                  <option key={item.channel} className="bg-[#4d071e]">{item.channel}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.11]"
            >
              <RefreshCw size={16} /> Оновити
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-5">
          <MetricCard label="Оборот" value={money(summary.revenue)} helper="весь обраний період" icon={TrendingUp} tone="mint" />
          <MetricCard label="Чеки" value={number(summary.orders)} helper="усі завершені замовлення" icon={CreditCard} />
          <MetricCard label="Середній чек" value={money(summary.averageCheck)} helper="оборот / кількість чеків" icon={ShoppingBasket} />
          <MetricCard label="Націнка" value={money(summary.markup)} helper={percent(summary.markupPercent)} icon={Flame} tone="mint" />
          <MetricCard label="Собівартість" value={money(summary.cost)} helper="розрахункова база" icon={Layers3} />
          <MetricCard label="Ідентифіковані" value={number(summary.identifiedCustomers)} helper={`${number(summary.identifiedOrders)} чеків із телефоном`} icon={Users} tone="dark" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Panel title="Динаміка продажів" subtitle="Оборот по днях із можливістю порівняння періодів" className="xl:col-span-8">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cfeeed" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#cfeeed" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} labelFormatter={dateLabel} />
                  <Area type="monotone" dataKey="revenue" stroke="#cfeeed" strokeWidth={3} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Канали продажів" subtitle="Частка обороту та ефективність" className="xl:col-span-4">
            <div className="h-[235px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={filteredChannels} dataKey="revenue" nameKey="channel" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {filteredChannels.map((_, index) => (
                      <Cell key={index} fill={['#cfeeed', '#f2d7c9', '#d89fb4', '#9ac9c7', '#fff0e8'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {filteredChannels.slice(0, 5).map((item) => (
                <div key={item.channel} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2 text-white/72">
                    {item.channel === 'Зал' ? <Store size={15} /> : <Truck size={15} />}
                    <span>{item.channel}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">{money(item.revenue)}</div>
                    <div className="text-xs text-white/40">{number(item.orders)} чеків · {percent(item.markupPercent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Години попиту" subtitle={hourPeak ? `Пік обороту: ${hourPeak.hour}:00` : 'Продажі по годинах'} className="xl:col-span-5">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, key) => key === 'revenue' ? money(value) : number(value)} />
                  <Bar dataKey="revenue" fill="#cfeeed" radius={[9, 9, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Топ страв" subtitle="Оборот, кількість і націнка" className="xl:col-span-7">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35 border-b border-white/10">
                    <th className="pb-4 font-semibold">Страва</th>
                    <th className="pb-4 font-semibold">Категорія</th>
                    <th className="pb-4 font-semibold text-right">Кількість</th>
                    <th className="pb-4 font-semibold text-right">Оборот</th>
                    <th className="pb-4 font-semibold text-right">Націнка</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item, index) => (
                    <tr key={`${item.productCode}-${index}`} className="border-b border-white/[0.07] hover:bg-white/[0.04] transition">
                      <td className="py-4 pr-4 font-semibold text-white/90">{item.productName}</td>
                      <td className="py-4 pr-4 text-white/45">{item.category || 'Без категорії'}</td>
                      <td className="py-4 text-right text-white/70">{number(item.quantity)}</td>
                      <td className="py-4 text-right font-bold text-[#cfeeed]">{money(item.revenue)}</td>
                      <td className="py-4 text-right text-white/70">{percent(item.markupPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock3, label: 'Hour Heatmap', note: 'наступний модуль' },
            { icon: UtensilsCrossed, label: 'Menu Engineering', note: 'Stars / Dogs / Puzzles' },
            { icon: Coffee, label: 'Upsell', note: 'напої, десерти, соуси' },
            { icon: Activity, label: 'AI Insights', note: 'автоматичні висновки' },
          ].map(({ icon: Icon, label, note }) => (
            <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/[0.07] flex items-center justify-center text-[#cfeeed]">
                <Icon size={19} />
              </div>
              <div>
                <div className="font-bold text-white/85">{label}</div>
                <div className="text-xs text-white/35 mt-1">{note}</div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-8 flex flex-col md:flex-row gap-3 md:items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-2"><CalendarDays size={14} /> Snapshot: {new Date(data.updatedAt).toLocaleString('uk-UA')}</div>
          <div>MARMOO · Sales Intelligence v1</div>
        </footer>
      </div>
    </div>
  );
}
