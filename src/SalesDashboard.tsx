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
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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

type PeriodKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'current_week'
  | 'previous_week'
  | 'current_month'
  | 'previous_month'
  | 'all';

type ChartMetric = 'revenue' | 'orders' | 'markup' | 'averageCheck';

type DateRange = {
  from: Date | null;
  to: Date | null;
  comparisonFrom: Date | null;
  comparisonTo: Date | null;
  label: string;
  comparisonLabel: string;
};

const SALES_DATA_URL = `${import.meta.env.BASE_URL || '/'}sales-data.json`;
const SOFT_OPENING = '2026-06-18';
const GRAND_OPENING = '2026-06-26';

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'Сьогодні' },
  { key: 'yesterday', label: 'Вчора' },
  { key: '7d', label: '7 днів' },
  { key: '30d', label: '30 днів' },
  { key: 'current_week', label: 'Поточний тиждень' },
  { key: 'previous_week', label: 'Минулий тиждень' },
  { key: 'current_month', label: 'Поточний місяць' },
  { key: 'previous_month', label: 'Минулий місяць' },
  { key: 'all', label: 'Весь період' },
];

const CHART_OPTIONS: Array<{ key: ChartMetric; label: string; color: string }> = [
  { key: 'revenue', label: 'Оборот', color: '#cfeeed' },
  { key: 'orders', label: 'Чеки', color: '#f5c8da' },
  { key: 'markup', label: 'Націнка', color: '#ffd9a8' },
  { key: 'averageCheck', label: 'Середній чек', color: '#b9a7ff' },
];

const money = (value: number) =>
  `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value || 0)} ₴`;

const number = (value: number) =>
  new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value || 0);

const percent = (value: number) => `${(value || 0).toFixed(1)}%`;
const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfWeek = (date: Date) => {
  const result = startOfDay(date);
  const weekday = result.getDay() || 7;
  result.setDate(result.getDate() - weekday + 1);
  return result;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const dateLabel = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short' }).format(date);
};

const fullDateLabel = (value: Date | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
};

const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid rgba(209,242,240,.18)',
  background: 'rgba(48,5,22,.97)',
  color: '#fffaf7',
  boxShadow: '0 20px 50px rgba(20,0,8,.35)',
};

function buildPeriodRange(period: PeriodKey, today: Date): DateRange {
  const day = startOfDay(today);
  if (period === 'today') {
    return { from: day, to: day, comparisonFrom: addDays(day, -1), comparisonTo: addDays(day, -1), label: 'Сьогодні', comparisonLabel: 'до вчора' };
  }
  if (period === 'yesterday') {
    const yesterday = addDays(day, -1);
    return { from: yesterday, to: yesterday, comparisonFrom: addDays(day, -2), comparisonTo: addDays(day, -2), label: 'Вчора', comparisonLabel: 'до позавчора' };
  }
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const from = addDays(day, -(days - 1));
    return { from, to: day, comparisonFrom: addDays(from, -days), comparisonTo: addDays(day, -days), label: `Останні ${days} днів`, comparisonLabel: `до попередніх ${days} днів` };
  }
  if (period === 'current_week') {
    const from = startOfWeek(day);
    return { from, to: day, comparisonFrom: addDays(from, -7), comparisonTo: addDays(day, -7), label: 'Поточний тиждень', comparisonLabel: 'до такого ж періоду минулого тижня' };
  }
  if (period === 'previous_week') {
    const to = addDays(startOfWeek(day), -1);
    const from = addDays(to, -6);
    return { from, to, comparisonFrom: addDays(from, -7), comparisonTo: addDays(to, -7), label: 'Минулий тиждень', comparisonLabel: 'до тижня перед ним' };
  }
  if (period === 'current_month') {
    const from = startOfMonth(day);
    const previousMonth = new Date(day.getFullYear(), day.getMonth() - 1, 1);
    const comparisonTo = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), Math.min(day.getDate(), endOfMonth(previousMonth).getDate()));
    return { from, to: day, comparisonFrom: previousMonth, comparisonTo, label: 'Поточний місяць', comparisonLabel: 'до такого ж періоду минулого місяця' };
  }
  if (period === 'previous_month') {
    const previousMonth = new Date(day.getFullYear(), day.getMonth() - 1, 1);
    const monthBefore = new Date(day.getFullYear(), day.getMonth() - 2, 1);
    return { from: previousMonth, to: endOfMonth(previousMonth), comparisonFrom: monthBefore, comparisonTo: endOfMonth(monthBefore), label: 'Минулий місяць', comparisonLabel: 'до місяця перед ним' };
  }
  return { from: null, to: null, comparisonFrom: null, comparisonTo: null, label: 'Весь період', comparisonLabel: 'без порівняння' };
}

function isInRange(value: string, from: Date | null, to: Date | null) {
  if (!from || !to) return true;
  const date = parseDate(value);
  return date >= from && date <= to;
}

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

function DeltaBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-[12px] font-semibold opacity-65">{label}</span>;
  const positive = value >= 0;
  return (
    <div className="flex min-w-[112px] flex-col items-end gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-black ${positive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {positive ? '+' : ''}{value.toFixed(1)}%
      </span>
      <span className="max-w-[125px] text-right text-[11px] font-semibold leading-tight opacity-70">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, helper, change, comparisonLabel, icon: Icon, tone = 'light' }: {
  label: string;
  value: string;
  helper: string;
  change?: number | null;
  comparisonLabel: string;
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
        <p className="text-[10px] uppercase tracking-[0.18em] opacity-65 font-black">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-white/35 flex items-center justify-center border border-white/35"><Icon size={18} /></div>
      </div>
      <div className="mt-3 text-[32px] leading-none font-black tracking-[-0.04em]">{value}</div>
      <div className="mt-5 flex min-h-[54px] items-start justify-between gap-3">
        <span className="pt-1 text-xs font-semibold opacity-70">{helper}</span>
        {change !== undefined && <DeltaBadge value={change} label={comparisonLabel} />}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
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
        <button onClick={onReload} className="mt-7 rounded-2xl bg-[#cfeeed] px-5 py-3 font-bold text-[#5b0b25]">Перевірити ще раз</button>
      </div>
    </div>
  );
}

export default function SalesDashboard() {
  const [data, setData] = useState<SalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('current_month');
  const [chartMetrics, setChartMetrics] = useState<ChartMetric[]>(['revenue', 'orders', 'markup']);

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

  const today = useMemo(() => startOfDay(new Date()), []);
  const range = useMemo(() => buildPeriodRange(period, today), [period, today]);
  const selectedDaily = useMemo(() => data ? data.daily.filter((row) => isInRange(row.date, range.from, range.to)) : [], [data, range]);
  const previousDaily = useMemo(() => (!data || period === 'all') ? [] : data.daily.filter((row) => isInRange(row.date, range.comparisonFrom, range.comparisonTo)), [data, period, range]);
  const current = useMemo(() => aggregateDaily(selectedDaily), [selectedDaily]);
  const previous = useMemo(() => aggregateDaily(previousDaily), [previousDaily]);

  const comparisons = {
    revenue: period === 'all' ? null : delta(current.revenue, previous.revenue),
    orders: period === 'all' ? null : delta(current.orders, previous.orders),
    averageCheck: period === 'all' ? null : delta(current.averageCheck, previous.averageCheck),
    markup: period === 'all' ? null : delta(current.markup, previous.markup),
    cost: period === 'all' ? null : delta(current.cost, previous.cost),
  };

  const topProducts = useMemo(() => data ? [...data.products].sort((a, b) => b.revenue - a.revenue).slice(0, 7) : [], [data]);
  const hourPeak = useMemo(() => data?.hourly.length ? [...data.hourly].sort((a, b) => b.revenue - a.revenue)[0] : null, [data]);
  const channelTotal = useMemo(() => data?.channels.reduce((sum, item) => sum + item.revenue, 0) || 0, [data]);

  const insights = useMemo(() => {
    if (!data) return [];
    const bestDay = [...selectedDaily].sort((a, b) => b.revenue - a.revenue)[0];
    return [
      comparisons.revenue === null ? null : `Оборот ${comparisons.revenue >= 0 ? 'виріс' : 'знизився'} на ${Math.abs(comparisons.revenue).toFixed(1)}% ${range.comparisonLabel}.`,
      comparisons.averageCheck === null ? null : `Середній чек ${comparisons.averageCheck >= 0 ? 'виріс' : 'знизився'} на ${Math.abs(comparisons.averageCheck).toFixed(1)}%.`,
      bestDay ? `Найкращий день — ${dateLabel(bestDay.date)}: ${money(bestDay.revenue)}.` : null,
      selectedDaily.length === 0 ? 'У вибраному періоді ще немає даних.' : null,
      hourPeak ? `Пікова година за всіма даними — ${hourPeak.hour}:00, оборот ${money(hourPeak.revenue)}.` : null,
    ].filter(Boolean) as string[];
  }, [data, selectedDaily, hourPeak, comparisons.revenue, comparisons.averageCheck, range.comparisonLabel]);

  const toggleChartMetric = (metric: ChartMetric) => {
    setChartMetrics((currentMetrics) =>
      currentMetrics.includes(metric)
        ? currentMetrics.length === 1 ? currentMetrics : currentMetrics.filter((item) => item !== metric)
        : [...currentMetrics, metric],
    );
  };

  if (loading) return <div className="min-h-screen bg-[#4d071e] text-white flex items-center justify-center"><RefreshCw className="animate-spin" /></div>;
  if (!data) return <EmptyState onReload={loadData} />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#7d1640_0%,#580822_34%,#3c0417_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-9">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-5">
          <div>
            <div className="flex items-center gap-3 text-[#cfeeed]">
              <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center"><BarChart3 size={23} /></div>
              <div><p className="text-[10px] uppercase tracking-[0.24em] text-white/42">MARMOO Intelligence</p><h1 className="text-4xl md:text-5xl font-black tracking-[-0.055em]">Sales BI</h1></div>
            </div>
            <p className="mt-4 text-white/50 text-sm">Олімпійська · Велика Васильківська, 57/3</p>
            <p className="mt-1 text-[#cfeeed]/70 text-sm font-semibold">{range.label}{range.from && range.to ? ` · ${fullDateLabel(range.from)} — ${fullDateLabel(range.to)}` : ` · ${dateLabel(data.period.from)} — ${dateLabel(data.period.to)}`}</p>
          </div>
          <button onClick={loadData} className="self-start xl:self-auto rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/70 inline-flex items-center gap-2"><RefreshCw size={17} /> Оновити snapshot</button>
        </header>

        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[#cfeeed]/25 bg-[#cfeeed]/10 px-3 py-2 text-[#cfeeed]">18.06.2026 · soft opening</span>
          <span className="rounded-full border border-[#ffd9a8]/25 bg-[#ffd9a8]/10 px-3 py-2 text-[#ffd9a8]">26.06.2026 · офіційне відкриття</span>
        </div>

        <div className="mb-6 overflow-x-auto pb-2"><div className="flex min-w-max gap-2">{PERIOD_OPTIONS.map((option) => (
          <button key={option.key} onClick={() => setPeriod(option.key)} className={`rounded-xl px-4 py-2.5 text-sm font-bold border transition ${period === option.key ? 'bg-[#cfeeed] text-[#5b0b25] border-[#cfeeed]' : 'bg-white/[0.05] border-white/10 text-white/65 hover:bg-white/[0.09]'}`}>{option.label}</button>
        ))}</div></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-5">
          <MetricCard label="Оборот" value={money(current.revenue)} helper={range.label} change={comparisons.revenue} comparisonLabel={range.comparisonLabel} icon={TrendingUp} tone="mint" />
          <MetricCard label="Чеки" value={number(current.orders)} helper="завершені замовлення" change={comparisons.orders} comparisonLabel={range.comparisonLabel} icon={CreditCard} />
          <MetricCard label="Середній чек" value={money(current.averageCheck)} helper="оборот / чеки" change={comparisons.averageCheck} comparisonLabel={range.comparisonLabel} icon={ShoppingBasket} />
          <MetricCard label="Націнка" value={money(current.markup)} helper={percent(current.markupPercent)} change={comparisons.markup} comparisonLabel={range.comparisonLabel} icon={Flame} tone="mint" />
          <MetricCard label="Собівартість" value={money(current.cost)} helper="розрахункова" change={comparisons.cost} comparisonLabel={range.comparisonLabel} icon={Layers3} />
          <MetricCard label="Клієнти" value={number(data.summary.identifiedCustomers)} helper={`${number(data.summary.identifiedOrders)} чеків із телефоном · весь період`} comparisonLabel="весь період" icon={Users} tone="dark" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Panel title="Динаміка продажів" subtitle={`${range.label} · обери показники`} className="xl:col-span-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {CHART_OPTIONS.map((option) => {
                const active = chartMetrics.includes(option.key);
                return <button key={option.key} onClick={() => toggleChartMetric(option.key)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active ? 'border-transparent text-[#390315]' : 'border-white/10 bg-white/[0.04] text-white/55'}`} style={active ? { backgroundColor: option.color } : undefined}>{option.label}</button>;
              })}
            </div>
            {selectedDaily.length ? (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={selectedDaily}>
                    <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cfeeed" stopOpacity={0.55} /><stop offset="100%" stopColor="#cfeeed" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fill: 'rgba(255,255,255,.52)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="money" tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="count" orientation="right" tick={{ fill: 'rgba(255,255,255,.38)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={dateLabel} formatter={(value: number, name: string) => [name === 'Чеки' ? number(value) : money(value), name]} />
                    {chartMetrics.includes('revenue') && <Area yAxisId="money" type="monotone" dataKey="revenue" name="Оборот" stroke="#cfeeed" strokeWidth={3} fill="url(#salesFill)" />}
                    {chartMetrics.includes('markup') && <Line yAxisId="money" type="monotone" dataKey="markup" name="Націнка" stroke="#ffd9a8" strokeWidth={3} dot={false} />}
                    {chartMetrics.includes('averageCheck') && <Line yAxisId="money" type="monotone" dataKey="averageCheck" name="Середній чек" stroke="#b9a7ff" strokeWidth={3} dot={false} />}
                    {chartMetrics.includes('orders') && <Bar yAxisId="count" dataKey="orders" name="Чеки" fill="#f5c8da" opacity={0.7} radius={[5, 5, 0, 0]} />}
                    {selectedDaily.some((row) => row.date === SOFT_OPENING) && <ReferenceLine x={SOFT_OPENING} stroke="#cfeeed" strokeDasharray="4 4" label={{ value: 'Soft opening', fill: '#cfeeed', fontSize: 11, position: 'insideTopLeft' }} />}
                    {selectedDaily.some((row) => row.date === GRAND_OPENING) && <ReferenceLine x={GRAND_OPENING} stroke="#ffd9a8" strokeDasharray="4 4" label={{ value: 'Grand opening', fill: '#ffd9a8', fontSize: 11, position: 'insideTopRight' }} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[350px] flex items-center justify-center rounded-2xl border border-dashed border-white/10 text-white/35">За цей період даних ще немає</div>}
          </Panel>

          <Panel title="Що змінилось" subtitle={range.comparisonLabel} className="xl:col-span-4"><div className="space-y-3">{insights.map((item, index) => <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm leading-relaxed text-white/72"><span className="mr-2 text-[#cfeeed] font-black">{index + 1}.</span>{item}</div>)}</div></Panel>

          <Panel title="Канали продажів" subtitle="Поки що — весь доступний період" className="xl:col-span-5"><div className="space-y-5">{data.channels.map((item) => { const share = channelTotal ? (item.revenue / channelTotal) * 100 : 0; return <div key={item.channel}><div className="mb-2 flex items-end justify-between gap-4"><div className="flex items-center gap-2 text-white/78">{item.channel === 'Зал' ? <Store size={15} /> : <Truck size={15} />}<span className="font-semibold">{item.channel}</span></div><div className="text-right"><div className="font-black text-[#cfeeed]">{money(item.revenue)}</div><div className="text-xs text-white/40">{share.toFixed(1)}% · {number(item.orders)} чеків</div></div></div><div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#cfeeed]" style={{ width: `${share}%` }} /></div></div>; })}</div></Panel>

          <Panel title="Години попиту" subtitle={hourPeak ? `Весь період · пік ${hourPeak.hour}:00 · ${money(hourPeak.revenue)}` : ''} className="xl:col-span-7"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.hourly}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} /><Bar dataKey="revenue" fill="#cfeeed" radius={[8, 8, 0, 0]} /></ComposedChart></ResponsiveContainer></div></Panel>

          <Panel title="Топ страв" subtitle="За весь доступний період" className="xl:col-span-12"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-[0.16em] text-white/35 border-b border-white/10"><th className="pb-4">#</th><th className="pb-4">Страва</th><th className="pb-4">Категорія</th><th className="pb-4 text-right">Кількість</th><th className="pb-4 text-right">Оборот</th><th className="pb-4 text-right">Націнка</th></tr></thead><tbody>{topProducts.map((item, index) => <tr key={`${item.productCode}-${index}`} className="border-b border-white/[0.07] hover:bg-white/[0.035]"><td className="py-4 text-[#cfeeed] font-black">{index + 1}</td><td className="py-4 font-semibold text-white/90">{item.productName}</td><td className="py-4 text-white/42">{item.category}</td><td className="py-4 text-right text-white/65">{number(item.quantity)}</td><td className="py-4 text-right font-black text-[#cfeeed]">{money(item.revenue)}</td><td className="py-4 text-right text-white/65">{percent(item.markupPercent)}</td></tr>)}</tbody></table></div></Panel>
        </div>

        <footer className="mt-7 flex flex-col md:flex-row gap-3 md:items-center justify-between text-xs text-white/28"><div className="flex items-center gap-2"><CalendarDays size={14} /> Snapshot: {new Date(data.updatedAt).toLocaleString('uk-UA')}</div><div className="flex items-center gap-2"><Clock3 size={14} /> Дані: {dateLabel(data.period.from)} — {dateLabel(data.period.to)}</div><div className="flex items-center gap-2"><Activity size={14} /> MARMOO Sales Intelligence v4</div></footer>
      </div>
    </div>
  );
}
