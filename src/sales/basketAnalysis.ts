import { normalizeProductName } from './semantic';

export interface BasketOrderItem {
  orderId: string;
  productName: string;
  category?: string;
  quantity?: number;
  revenue?: number;
}

export interface BasketPair {
  itemA: string;
  itemB: string;
  coOccurrence: number;
  support: number;
  confidenceAToB: number;
  confidenceBToA: number;
  lift: number;
}

export interface BasketAnalysisResult {
  totalOrders: number;
  uniqueProducts: number;
  pairs: BasketPair[];
}

export function calculateBasketAnalysis(items: BasketOrderItem[]): BasketAnalysisResult {
  const orders = new Map<string, Set<string>>();
  const productOrders = new Map<string, number>();
  const displayNames = new Map<string, string>();

  items.forEach(item => {
    const orderId = String(item.orderId || '').trim();
    const productName = normalizeProductName(item.productName || '');
    if (!orderId || !productName) return;

    const key = productName.toLowerCase();
    displayNames.set(key, productName);
    if (!orders.has(orderId)) orders.set(orderId, new Set());
    orders.get(orderId)!.add(key);
  });

  orders.forEach(products => {
    products.forEach(product => productOrders.set(product, (productOrders.get(product) || 0) + 1));
  });

  const pairCounts = new Map<string, number>();
  orders.forEach(products => {
    const array = [...products].sort();
    for (let i = 0; i < array.length; i += 1) {
      for (let j = i + 1; j < array.length; j += 1) {
        const pairKey = `${array[i]}|||${array[j]}`;
        pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
      }
    }
  });

  const totalOrders = orders.size;
  const pairs = [...pairCounts.entries()].map(([key, coOccurrence]) => {
    const [a, b] = key.split('|||');
    const ordersA = productOrders.get(a) || 0;
    const ordersB = productOrders.get(b) || 0;
    const support = totalOrders ? coOccurrence / totalOrders : 0;
    const confidenceAToB = ordersA ? coOccurrence / ordersA : 0;
    const confidenceBToA = ordersB ? coOccurrence / ordersB : 0;
    const probabilityB = totalOrders ? ordersB / totalOrders : 0;
    const lift = probabilityB ? confidenceAToB / probabilityB : 0;

    return {
      itemA: displayNames.get(a) || a,
      itemB: displayNames.get(b) || b,
      coOccurrence,
      support,
      confidenceAToB,
      confidenceBToA,
      lift
    };
  }).sort((a, b) => b.coOccurrence - a.coOccurrence || b.lift - a.lift);

  return { totalOrders, uniqueProducts: productOrders.size, pairs };
}

export function selectActionablePairs(
  result: BasketAnalysisResult,
  minimumOrders = 10,
  minimumLift = 1.05
) {
  return result.pairs.filter(pair => pair.coOccurrence >= minimumOrders && pair.lift >= minimumLift);
}
