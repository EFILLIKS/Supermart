import type { Order, Product } from "@/types";
import { formatMoney } from "./format";

/**
 * The seam for a real model. `demoProvider` is a local rule engine, not AI: it matches keywords
 * against the live catalogue and computes statistics from real orders. To connect a model, implement
 * AssistantProvider behind a server function, so that the API key never reaches the browser.
 */
export interface AssistantReply {
  text: string;
  products: Product[];
  listItems?: string[];
}

export interface AssistantProvider {
  readonly name: string;
  readonly isSimulated: boolean;
  reply(message: string, context: { products: Product[]; orders: Order[] }): Promise<AssistantReply>;
}

const THEMES: { words: string[]; tag: string; label: string }[] = [
  { words: ["breakfast", "morning"], tag: "breakfast", label: "breakfast" },
  { words: ["dinner", "supper", "curry", "cook"], tag: "dinner", label: "dinner" },
  { words: ["healthy", "fit", "protein", "diet", "clean"], tag: "healthy", label: "healthy" },
  { words: ["keto", "low carb", "low-carb"], tag: "keto", label: "keto-friendly" },
  { words: ["vegan", "plant"], tag: "vegan", label: "vegan" },
  { words: ["vegetarian", "veg "], tag: "vegetarian", label: "vegetarian" },
  { words: ["kid", "child", "school", "lunchbox", "tiffin"], tag: "kids", label: "kid-friendly" },
  { words: ["party", "guest", "movie", "friends"], tag: "party", label: "party" },
  { words: ["snack", "munch", "crunchy"], tag: "snack", label: "snack" },
  { words: ["dessert", "sweet", "treat"], tag: "dessert", label: "sweet" },
  { words: ["salad"], tag: "salad", label: "salad" },
  { words: ["indian", "dal", "roti", "sabzi"], tag: "indian", label: "Indian kitchen" },
  { words: ["budget", "cheap", "save", "affordable"], tag: "budget", label: "budget-friendly" },
  { words: ["clean", "household", "laundry", "eco"], tag: "home", label: "household" },
];

const STOP = new Set(["i", "a", "an", "the", "for", "me", "my", "some", "want", "need", "show", "find", "get", "with", "and", "under", "below", "less", "than", "of", "to", "please", "something", "have", "do", "you", "any", "rs", "inr", "what", "good", "best"]);

function parseBudget(q: string) {
  const m = q.match(/(?:under|below|less than|within|upto|up to|max)\s*(?:rs\.?|₹|inr)?\s*(\d+)/) ?? q.match(/₹\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function search(query: string, products: Product[]) {
  const q = ` ${query.toLowerCase()} `;
  const budget = parseBudget(q);
  const themes = THEMES.filter((t) => t.words.some((w) => q.includes(w)));
  const words = q.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const scored = products
    .filter((p) => p.active && p.stock > 0 && (budget === null || p.price <= budget))
    .map((p) => {
      const text = `${p.name} ${p.brand} ${p.description}`.toLowerCase();
      let score = themes.reduce((s, t) => s + (p.tags.includes(t.tag) ? 3 : 0), 0);
      score += words.reduce((s, w) => s + (p.name.toLowerCase().includes(w) ? 4 : text.includes(w) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0 || (budget !== null && !words.length && !themes.length))
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price);
  return { items: scored.map((x) => x.p), themes, budget };
}

const RECIPES: { words: string[]; title: string; items: string[] }[] = [
  { words: ["dal", "tadka"], title: "dal tadka and rice", items: ["Unpolished Toor Dal", "Aged Basmati Rice", "Vine Tomatoes", "Red Onions", "Stone Ground Turmeric", "Fine Rock Salt", "Salted Butter"] },
  { words: ["paneer"], title: "a paneer dinner", items: ["Malai Paneer", "Vine Tomatoes", "Red Onions", "Stone Milled Atta", "Cold Pressed Groundnut Oil", "Stone Ground Turmeric"] },
  { words: ["pancake", "brunch", "toast", "breakfast"], title: "a relaxed breakfast", items: ["Country Sourdough", "Free Range Eggs", "Hass Avocados", "Salted Butter", "Cold Pressed Orange", "South Indian Filter Kaapi"] },
  { words: ["party", "movie", "guest"], title: "having friends over", items: ["Peri Masala Makhana", "Baked Seed Crisps", "Kerala Banana Chips", "Nuts & Berries Trail Mix", "Ginger Lime Kombucha", "Himalayan Spring Water"] },
  { words: ["week", "weekly", "monthly", "family", "stock", "essentials"], title: "a weekly family shop", items: ["Toned Milk", "Free Range Eggs", "Multigrain Loaf", "Robusta Bananas", "Farm Potatoes", "Red Onions", "Vine Tomatoes", "Stone Milled Atta", "Unpolished Toor Dal"] },
  { words: ["salad", "healthy"], title: "a week of good salads", items: ["Baby Spinach", "Hass Avocados", "Bhagwa Pomegranate", "Greek Yogurt", "Ooty Carrots", "Baked Seed Crisps"] },
];

export function suggestList(prompt: string, products: Product[]) {
  const q = prompt.toLowerCase();
  const recipe = RECIPES.find((r) => r.words.some((w) => q.includes(w)));
  if (!recipe) return null;
  const items = recipe.items.map((name) => products.find((p) => p.name === name && p.active)).filter((p): p is Product => Boolean(p));
  return { title: recipe.title, items };
}

/** Frequency of repeat purchases across a customer's history, with catalogue favourites as a fallback. */
export function recommend(products: Product[], orders: Order[], customerId: string | undefined, exclude: string[] = [], count = 8): { items: Product[]; reason: string } {
  const counts = new Map<string, number>();
  orders.filter((o) => o.customerId === customerId && o.status !== "CANCELLED").forEach((o) => o.lines.forEach((l) => counts.set(l.productId, (counts.get(l.productId) ?? 0) + l.quantity)));
  const available = products.filter((p) => p.active && p.stock > 0 && !exclude.includes(p.id));
  const bought = available.filter((p) => counts.has(p.id)).sort((a, b) => counts.get(b.id)! - counts.get(a.id)!);
  if (bought.length >= 4) return { items: bought.slice(0, count), reason: "Based on what you buy most often" };
  const popular = new Map<string, number>();
  orders.forEach((o) => o.lines.forEach((l) => popular.set(l.productId, (popular.get(l.productId) ?? 0) + l.quantity)));
  return { items: [...bought, ...available.filter((p) => !counts.has(p.id)).sort((a, b) => (popular.get(b.id) ?? 0) - (popular.get(a.id) ?? 0))].slice(0, count), reason: "Popular at the store right now" };
}

export interface SalesInsight {
  title: string;
  detail: string;
  tone: "good" | "warning" | "info";
}

export function salesInsights(products: Product[], orders: Order[]): SalesInsight[] {
  const day = 86400000;
  const now = Date.now();
  const valid = orders.filter((o) => o.status !== "CANCELLED");
  const inRange = (from: number, to: number) => valid.filter((o) => { const age = now - new Date(o.placedAt).getTime(); return age >= from * day && age < to * day; });
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);
  const thisWeek = sum(inRange(0, 7));
  const lastWeek = sum(inRange(7, 14));
  const change = lastWeek ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const revenueBy = new Map<string, number>();
  inRange(0, 30).forEach((o) => o.lines.forEach((l) => revenueBy.set(l.name, (revenueBy.get(l.name) ?? 0) + l.price * l.quantity)));
  const top = [...revenueBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const pos = inRange(0, 30).filter((o) => o.channel === "POS");
  const share = inRange(0, 30).length ? (pos.length / inRange(0, 30).length) * 100 : 0;
  const hours = new Array(24).fill(0) as number[];
  inRange(0, 30).forEach((o) => { hours[new Date(o.placedAt).getHours()]++; });
  const peak = hours.indexOf(Math.max(...hours));
  const low = forecastStock(products, orders).filter((f) => f.daysLeft <= 5);
  return [
    { title: `Revenue is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% week on week`, detail: `${formatMoney(thisWeek)} in the last 7 days against ${formatMoney(lastWeek)} the week before.`, tone: change >= 0 ? "good" : "warning" },
    top ? { title: `${top[0]} is your top earner`, detail: `It brought in ${formatMoney(top[1])} over 30 days. Keep it prominent and well stocked.`, tone: "info" } : { title: "No top earner yet", detail: "There are no sales in the last 30 days.", tone: "info" },
    { title: `Orders peak around ${peak % 12 || 12} ${peak < 12 ? "am" : "pm"}`, detail: `Plan counter and packing staff around this hour. In-store sales are ${share.toFixed(0)}% of orders.`, tone: "info" },
    { title: low.length ? `${low.length} products may run out within 5 days` : "No stock-outs expected this week", detail: low.length ? `Most urgent: ${low.slice(0, 3).map((x) => x.product.name).join(", ")}.` : "Every product has more than 5 days of cover at the current sales rate.", tone: low.length ? "warning" : "good" },
  ];
}

export interface StockForecast {
  product: Product;
  dailyRate: number;
  daysLeft: number;
  suggestedReorder: number;
}

/** A simple 28-day moving average of units sold. A statistical estimate, not a trained model. */
export function forecastStock(products: Product[], orders: Order[], windowDays = 28): StockForecast[] {
  const since = Date.now() - windowDays * 86400000;
  const sold = new Map<string, number>();
  orders.filter((o) => o.status !== "CANCELLED" && new Date(o.placedAt).getTime() >= since).forEach((o) => o.lines.forEach((l) => sold.set(l.productId, (sold.get(l.productId) ?? 0) + l.quantity)));
  return products
    .filter((p) => p.active)
    .map((product) => {
      const dailyRate = (sold.get(product.id) ?? 0) / windowDays;
      const daysLeft = dailyRate > 0 ? product.stock / dailyRate : Infinity;
      return { product, dailyRate, daysLeft, suggestedReorder: Math.max(0, Math.ceil(dailyRate * 14 - product.stock)) };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export const demoProvider: AssistantProvider = {
  name: "Demo rule engine",
  isSimulated: true,
  async reply(message, { products, orders }) {
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));
    const q = message.toLowerCase();

    if (/(sales|revenue|insight|how.*(store|business)|performance)/.test(q)) {
      const insights = salesInsights(products, orders);
      return { text: `Here is what your store's order data shows:\n\n${insights.map((i) => `• ${i.title}. ${i.detail}`).join("\n")}`, products: [] };
    }
    if (/(list|plan|ingredients|what.*(need|buy)|shopping for|make |cook )/.test(q)) {
      const plan = suggestList(q, products);
      if (plan) return { text: `For ${plan.title}, I would put these on your list. You can add everything to your basket in one tap.`, products: plan.items, listItems: plan.items.map((p) => p.name) };
    }
    if (/(recommend|suggest|surprise|what should)/.test(q) && !THEMES.some((t) => t.words.some((w) => q.includes(w)))) {
      return { text: "These are the most popular items at the store right now:", products: recommend(products, orders, undefined, [], 4).items };
    }
    const { items, themes, budget } = search(q, products);
    if (!items.length) {
      return { text: `I could not find anything for "${message}". Try a food name, a meal such as "breakfast", a diet such as "vegan", or a budget such as "snacks under 150".`, products: [] };
    }
    const bits = [themes.map((t) => t.label).join(", "), budget ? `under ${formatMoney(budget)}` : ""].filter(Boolean).join(" ");
    return { text: `I found ${items.length} ${items.length === 1 ? "match" : "matches"}${bits ? ` for ${bits}` : ""}. Here are the closest:`, products: items.slice(0, 4) };
  },
};

export const assistant: AssistantProvider = demoProvider;
