import { computeTotals } from "../lib/pricing.ts";
import type { Address, Customer, Employee, Order, OrderEvent, OrderLine, OrderStatus, PaymentMethod, Product, Review, Settings, StockMovement } from "../types.ts";
import { PRODUCTS } from "./catalog.ts";

/** Small seeded PRNG so that demo data is stable between resets. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AREAS: [string, string][] = [
  ["Koregaon Park", "411001"], ["Baner", "411045"], ["Aundh", "411007"], ["Kothrud", "411038"], ["Viman Nagar", "411014"],
  ["Kalyani Nagar", "411006"], ["Hadapsar", "411028"], ["Wakad", "411057"],
];
const NAMES = ["Ananya Rao", "Rohan Mehta", "Priya Nair", "Kabir Singh", "Meera Iyer", "Arjun Kulkarni", "Sana Sheikh", "Dev Patel", "Isha Deshpande", "Vihaan Joshi", "Tara Menon", "Neil Fernandes", "Aisha Khan", "Siddharth Bose"];

export const DEMO_IDS = { customer: "cust-1", admin: "emp-admin", sales: "emp-sales", driver: "emp-driver" };

export const SEED_CUSTOMERS: Customer[] = NAMES.map((name, i) => {
  const [area, pin] = AREAS[i % AREAS.length];
  const addresses: Address[] = [{ id: `addr-${i + 1}`, label: "Home", line1: `${12 + i * 7}, ${["Lotus", "Sai", "Green", "Orchid"][i % 4]} Residency`, line2: `${area}`, city: "Pune", state: "Maharashtra", postalCode: pin, isDefault: true }];
  if (i === 0) addresses.push({ id: "addr-1b", label: "Office", line1: "4th Floor, Riverside Tech Park", line2: "Kalyani Nagar", city: "Pune", state: "Maharashtra", postalCode: "411006" });
  return {
    id: `cust-${i + 1}`,
    name,
    phone: `+91 90000 ${String(10001 + i * 37)}`,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    loyaltyPoints: 120 + ((i * 83) % 900),
    joinedAt: new Date(Date.now() - (30 + i * 19) * 86400000).toISOString(),
    addresses,
  };
});

const emp = (id: string, name: string, role: Employee["role"], code: string, department: string, shift: string, active = true): Employee => ({
  id, name, role, code, department, shift, active,
  email: `${name.split(" ")[0].toLowerCase()}@supermart.example`,
  phone: `+91 90000 2${code.slice(-4)}`,
  hiredOn: new Date(Date.now() - (120 + code.charCodeAt(code.length - 1) * 11) * 86400000).toISOString(),
});

export const SEED_EMPLOYEES: Employee[] = [
  emp(DEMO_IDS.admin, "Nisha Verma", "ADMIN", "SM-0001", "Store Management", "General"),
  emp("emp-admin2", "Farhan Ali", "ADMIN", "SM-0002", "Operations", "General"),
  emp(DEMO_IDS.sales, "Rahul Pawar", "SALES", "SM-0103", "Front Counter", "Morning"),
  emp("emp-sales2", "Kavya Shetty", "SALES", "SM-0104", "Front Counter", "Evening"),
  emp("emp-sales3", "Manoj Gaikwad", "SALES", "SM-0105", "Front Counter", "Morning", false),
  emp(DEMO_IDS.driver, "Imran Qureshi", "DELIVERY", "SM-0206", "Last Mile", "Morning"),
  emp("emp-driver2", "Sunil Jadhav", "DELIVERY", "SM-0207", "Last Mile", "Evening"),
  emp("emp-driver3", "Lakshmi Pillai", "DELIVERY", "SM-0208", "Last Mile", "Morning"),
];

export const SEED_SETTINGS: Settings = { storeName: "Grocery Supermart AI", supportPhone: "+91 90000 00000", freeDeliveryOver: 499, deliveryFee: 39, driverPayout: 45 };

const REVIEW_LINES: [number, string][] = [
  [5, "Exactly as fresh as promised. This is now on my weekly list."],
  [5, "Great quality and it arrived well packed. No complaints at all."],
  [4, "Really good, though I would love a larger pack size."],
  [4, "Tastes better than what I was buying before. Worth the small premium."],
  [5, "My kids finished this in two days. Ordering more."],
  [3, "Decent, but the last batch was a little better."],
];

export function buildSeed(now = Date.now()) {
  const random = rng(20261106);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const day = 86400000;
  const orders: Order[] = [];
  let seq = 10001;

  const toLine = (p: Product, quantity: number): OrderLine => ({ productId: p.id, name: p.name, unit: p.unit, image: p.image, price: p.price, taxRate: p.taxRate, quantity });
  const basket = () => {
    const count = 1 + Math.floor(random() * 5);
    const seen = new Set<string>();
    const lines: OrderLine[] = [];
    while (lines.length < count) {
      const p = pick(PRODUCTS);
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      lines.push(toLine(p, 1 + Math.floor(random() * 3)));
    }
    return lines;
  };
  const timeline = (placed: number, statuses: OrderStatus[]): OrderEvent[] => statuses.map((status, i) => ({ status, at: new Date(placed + i * 38 * 60000).toISOString() }));
  const drivers = SEED_EMPLOYEES.filter((e) => e.role === "DELIVERY" && e.active);

  const makeOnline = (placed: number, customer: Customer, statuses: OrderStatus[], driver?: Employee, lines = basket()): Order => {
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const discount = random() < 0.2 ? Math.round(subtotal * 0.1) : 0;
    const deliveryFee = subtotal - discount >= SEED_SETTINGS.freeDeliveryOver ? 0 : SEED_SETTINGS.deliveryFee;
    const totals = computeTotals(lines, discount, deliveryFee);
    const status = statuses[statuses.length - 1];
    const events = timeline(placed, statuses);
    const delivered = status === "DELIVERED";
    const method: PaymentMethod = pick(["UPI", "UPI", "CARD", "COD"]);
    const order: Order = {
      id: `ord-${seq}`, number: `SM-${seq++}`, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
      address: customer.addresses[0], channel: "ONLINE", status, lines, ...totals,
      slot: pick(["Today, 6 to 8 pm", "Today, 8 to 10 am", "Tomorrow, 10 am to 12 pm"]),
      couponCode: discount ? "WEEKEND10" : undefined,
      payment: { method, status: status === "CANCELLED" ? "FAILED" : method === "COD" && !delivered ? "PENDING" : "PAID", reference: method === "COD" ? undefined : `DEMO${seq}` },
      placedAt: new Date(placed).toISOString(), events,
      otp: delivered || status === "CANCELLED" ? undefined : String(100000 + Math.floor(random() * 900000)),
    };
    if (driver) {
      order.assignment = {
        driverId: driver.id, driverName: driver.name, earning: SEED_SETTINGS.driverPayout + Math.floor(random() * 3) * 5,
        status: delivered ? "DELIVERED" : status === "OUT_FOR_DELIVERY" ? "PICKED_UP" : "ASSIGNED",
        assignedAt: new Date(placed + 40 * 60000).toISOString(),
        pickedUpAt: delivered || status === "OUT_FOR_DELIVERY" ? new Date(placed + 76 * 60000).toISOString() : undefined,
        deliveredAt: delivered ? events[events.length - 1].at : undefined,
      };
    }
    return order;
  };

  for (let d = 59; d >= 1; d--) {
    const date = now - d * day;
    const weekend = [0, 6].includes(new Date(date).getDay());
    const trend = 1 + (59 - d) / 90;
    const onlineCount = Math.round((2 + random() * 2 + (weekend ? 2 : 0)) * trend);
    const posCount = Math.round((1 + random() * 2 + (weekend ? 1 : 0)) * trend);
    const startOfDay = new Date(date).setHours(8, 0, 0, 0);
    for (let i = 0; i < onlineCount; i++) {
      const placed = startOfDay + random() * 12 * 3600000;
      const cancelled = random() < 0.05;
      orders.push(cancelled
        ? makeOnline(placed, pick(SEED_CUSTOMERS), ["PLACED", "CANCELLED"])
        : makeOnline(placed, pick(SEED_CUSTOMERS), ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"], pick(drivers)));
    }
    for (let i = 0; i < posCount; i++) orders.push(makePos(startOfDay + random() * 12 * 3600000));
  }

  function makePos(placed: number): Order {
    const lines = basket();
    const walkIn = random() < 0.6;
    const customer = walkIn ? null : pick(SEED_CUSTOMERS);
    const totals = computeTotals(lines, 0, 0);
    return {
      id: `ord-${seq}`, number: `SM-${seq++}`, customerId: customer?.id ?? null, customerName: customer?.name ?? "Walk-in customer", customerPhone: customer?.phone ?? "",
      address: null, channel: "POS", status: "COMPLETED", lines, ...totals,
      payment: { method: pick<PaymentMethod>(["CASH", "UPI", "UPI", "ONLINE"]), status: "PAID" },
      placedAt: new Date(placed).toISOString(), events: timeline(placed, ["COMPLETED"]), cashierId: pick([DEMO_IDS.sales, "emp-sales2"]),
    };
  }

  // Today: POS sales plus a live pipeline at every stage, so that each portal has something to do.
  for (let i = 0; i < 6; i++) orders.push(makePos(now - (i + 1) * 47 * 60000));
  const [me, c2, c3, c4, c5, c6] = SEED_CUSTOMERS;
  const driver = SEED_EMPLOYEES.find((e) => e.id === DEMO_IDS.driver)!;
  orders.push(makeOnline(now - 200 * 60000, c2, ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"], driver));
  orders.push(makeOnline(now - 150 * 60000, me, ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"], driver));
  orders.push(makeOnline(now - 95 * 60000, c3, ["PLACED", "CONFIRMED", "PACKED"], driver));
  orders.push(makeOnline(now - 80 * 60000, c4, ["PLACED", "CONFIRMED", "PACKED"], driver));
  orders.push(makeOnline(now - 60 * 60000, c5, ["PLACED", "CONFIRMED", "PACKED"]));
  orders.push(makeOnline(now - 35 * 60000, c6, ["PLACED", "CONFIRMED"]));
  orders.push(makeOnline(now - 18 * 60000, c2, ["PLACED"]));
  orders.push(makeOnline(now - 6 * 60000, me, ["PLACED"]));

  orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  const reviews: Review[] = PRODUCTS.flatMap((p, pi) =>
    Array.from({ length: 2 + (pi % 3) }, (_, i) => {
      const [rating, body] = REVIEW_LINES[(pi + i * 2) % REVIEW_LINES.length];
      const author = SEED_CUSTOMERS[(pi + i + 1) % SEED_CUSTOMERS.length];
      return { id: `rev-${pi}-${i}`, productId: p.id, customerId: author.id, author: author.name, rating, body, createdAt: new Date(now - (i + 1) * (pi + 3) * day * 0.6).toISOString() };
    }),
  );

  const movements: StockMovement[] = [];
  PRODUCTS.forEach((p, i) => {
    movements.push({ id: `mv-${i}a`, productId: p.id, delta: 40 + (i % 5) * 20, reason: "RESTOCK", note: "Weekly supplier delivery", at: new Date(now - (2 + (i % 6)) * day).toISOString() });
    if (i % 7 === 0) movements.push({ id: `mv-${i}b`, productId: p.id, delta: -(1 + (i % 4)), reason: "DAMAGE", note: "Damaged in handling", at: new Date(now - (1 + (i % 3)) * day).toISOString() });
  });
  movements.sort((a, b) => b.at.localeCompare(a.at));

  return { orders, reviews, movements, nextOrderNumber: seq };
}
