import type { Category, Order, Product } from "@/types";

const DAY = 86400000;
const valid = (o: Order) => o.status !== "CANCELLED";

export interface DayPoint {
  key: string;
  label: string;
  revenue: number;
  online: number;
  pos: number;
  orders: number;
}

export function dailySeries(orders: Order[], days: number): DayPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    points.set(d.toDateString(), { key: d.toISOString(), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0, online: 0, pos: 0, orders: 0 });
  }
  orders.filter(valid).forEach((o) => {
    const p = points.get(new Date(o.placedAt).toDateString());
    if (!p) return;
    p.revenue += o.total;
    p.orders += 1;
    if (o.channel === "POS") p.pos += o.total;
    else p.online += o.total;
  });
  return [...points.values()];
}

export function periodStats(orders: Order[], days: number) {
  const now = Date.now();
  const inWindow = (from: number, to: number) => orders.filter((o) => valid(o) && now - new Date(o.placedAt).getTime() >= from * DAY && now - new Date(o.placedAt).getTime() < to * DAY);
  const cur = inWindow(0, days);
  const prev = inWindow(days, days * 2);
  const sum = (l: Order[]) => l.reduce((s, o) => s + o.total, 0);
  const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const revenue = sum(cur);
  const prevRevenue = sum(prev);
  const customers = new Set(cur.map((o) => o.customerId).filter(Boolean)).size;
  const prevCustomers = new Set(prev.map((o) => o.customerId).filter(Boolean)).size;
  const aov = cur.length ? revenue / cur.length : 0;
  const prevAov = prev.length ? prevRevenue / prev.length : 0;
  return {
    revenue, orders: cur.length, aov, customers,
    revenueDelta: delta(revenue, prevRevenue), ordersDelta: delta(cur.length, prev.length), aovDelta: delta(aov, prevAov), customersDelta: delta(customers, prevCustomers),
  };
}

export function topProducts(orders: Order[], days: number, limit = 8) {
  const since = Date.now() - days * DAY;
  const map = new Map<string, { name: string; revenue: number; units: number }>();
  orders.filter((o) => valid(o) && new Date(o.placedAt).getTime() >= since).forEach((o) => o.lines.forEach((l) => {
    const cur = map.get(l.name) ?? { name: l.name, revenue: 0, units: 0 };
    cur.revenue += l.price * l.quantity;
    cur.units += l.quantity;
    map.set(l.name, cur);
  }));
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function categoryRevenue(orders: Order[], products: Product[], categories: Category[], days: number) {
  const since = Date.now() - days * DAY;
  const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const map = new Map<string, number>();
  orders.filter((o) => valid(o) && new Date(o.placedAt).getTime() >= since).forEach((o) => o.lines.forEach((l) => {
    const c = catOf.get(l.productId);
    if (c) map.set(c, (map.get(c) ?? 0) + l.price * l.quantity);
  }));
  return categories.map((c) => ({ name: c.name, revenue: map.get(c.id) ?? 0 })).sort((a, b) => b.revenue - a.revenue);
}

export function paymentMix(orders: Order[], days: number) {
  const since = Date.now() - days * DAY;
  const map = new Map<string, number>();
  orders.filter((o) => valid(o) && new Date(o.placedAt).getTime() >= since).forEach((o) => map.set(o.payment.method, (map.get(o.payment.method) ?? 0) + o.total));
  return [...map.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
}
