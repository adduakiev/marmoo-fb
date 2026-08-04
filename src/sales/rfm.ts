export interface CustomerOrder {
  orderId: string;
  orderDate: string;
  customerPhone?: string;
  revenue: number;
  channel?: string;
}

export interface CustomerProfile {
  customerId: string;
  ordersCount: number;
  totalSpend: number;
  averageCheck: number;
  firstOrderDate: string;
  lastOrderDate: string;
  recencyDays: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmScore: string;
  segment: string;
  channels: string[];
}

export function normalizeUkrainianPhone(raw?: string): string | null {
  const candidates = String(raw || '').match(/(?:\+?38)?0\d{9}/g) || [];
  if (!candidates.length) return null;
  const digits = candidates[0].replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `38${digits}`;
  if (digits.length === 12 && digits.startsWith('380')) return digits;
  return null;
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function highIsGoodScore(value: number, q20: number, q40: number, q60: number, q80: number) {
  if (value <= q20) return 1;
  if (value <= q40) return 2;
  if (value <= q60) return 3;
  if (value <= q80) return 4;
  return 5;
}

function lowIsGoodScore(value: number, q20: number, q40: number, q60: number, q80: number) {
  return 6 - highIsGoodScore(value, q20, q40, q60, q80);
}

function segmentFor(r: number, f: number, m: number) {
  if (r >= 4 && f >= 4 && m >= 4) return 'VIP / Чемпіони';
  if (r >= 4 && f >= 3) return 'Лояльні активні';
  if (r >= 4 && f <= 2) return 'Нові перспективні';
  if (r === 3 && f >= 3) return 'Потребують уваги';
  if (r <= 2 && f >= 4) return 'У ризику';
  if (r <= 2 && f <= 2) return 'Сплячі';
  return 'Регулярні';
}

export function buildCustomerProfiles(orders: CustomerOrder[], referenceDate?: string): CustomerProfile[] {
  const valid = orders
    .map(order => ({ ...order, customerPhone: normalizeUkrainianPhone(order.customerPhone) }))
    .filter(order => order.customerPhone && order.orderDate && Number(order.revenue) > 0);

  const latestDate = referenceDate || valid.map(x => x.orderDate).sort().at(-1) || new Date().toISOString().slice(0, 10);
  const reference = new Date(`${latestDate}T00:00:00`);
  const grouped = new Map<string, { dates: string[]; orderIds: Set<string>; spend: number; channels: Set<string> }>();

  valid.forEach(order => {
    const key = order.customerPhone!;
    const current = grouped.get(key) || { dates: [], orderIds: new Set<string>(), spend: 0, channels: new Set<string>() };
    current.dates.push(order.orderDate);
    current.orderIds.add(order.orderId);
    current.spend += Number(order.revenue) || 0;
    if (order.channel) current.channels.add(order.channel);
    grouped.set(key, current);
  });

  const raw = [...grouped.entries()].map(([customerId, value]) => {
    const dates = value.dates.sort();
    const lastOrderDate = dates.at(-1)!;
    const recencyDays = Math.max(0, Math.round((reference.getTime() - new Date(`${lastOrderDate}T00:00:00`).getTime()) / 86400000));
    const ordersCount = value.orderIds.size;
    return {
      customerId,
      ordersCount,
      totalSpend: value.spend,
      averageCheck: ordersCount ? value.spend / ordersCount : 0,
      firstOrderDate: dates[0],
      lastOrderDate,
      recencyDays,
      channels: [...value.channels]
    };
  });

  const recencies = raw.map(x => x.recencyDays);
  const frequencies = raw.map(x => x.ordersCount);
  const monetary = raw.map(x => x.totalSpend);
  const rq = [0.2, 0.4, 0.6, 0.8].map(q => quantile(recencies, q));
  const fq = [0.2, 0.4, 0.6, 0.8].map(q => quantile(frequencies, q));
  const mq = [0.2, 0.4, 0.6, 0.8].map(q => quantile(monetary, q));

  return raw.map(customer => {
    const rScore = lowIsGoodScore(customer.recencyDays, rq[0], rq[1], rq[2], rq[3]);
    const fScore = highIsGoodScore(customer.ordersCount, fq[0], fq[1], fq[2], fq[3]);
    const mScore = highIsGoodScore(customer.totalSpend, mq[0], mq[1], mq[2], mq[3]);
    return {
      ...customer,
      rScore,
      fScore,
      mScore,
      rfmScore: `${rScore}${fScore}${mScore}`,
      segment: segmentFor(rScore, fScore, mScore)
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);
}
