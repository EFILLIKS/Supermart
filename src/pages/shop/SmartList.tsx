import { AnimatePresence, motion, Reorder } from "framer-motion";
import { GripVertical, Plus, ShoppingBasket, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel, ProductImage, QuantityStepper, SimulatedAiBadge } from "@/components/shared";
import { suggestList } from "@/lib/ai";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { ListItem, Product } from "@/types";

const IDEAS = ["Dal tadka", "Weekly family shop", "Relaxed breakfast", "Friends over", "A week of salads"];

/** Finds the product a typed item most likely means, using whole-word matches. */
function matchProduct(text: string, products: Product[]) {
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let best: { p: Product; score: number } | null = null;
  for (const p of products) {
    if (!p.active) continue;
    const name = p.name.toLowerCase();
    const score = words.reduce((s, w) => s + (name.includes(w) || name.includes(w.replace(/s$/, "")) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  return best?.p;
}

export default function SmartList() {
  const items = useStore((s) => s.smartList);
  const setItems = useStore((s) => s.setSmartList);
  const products = useStore((s) => s.products);
  const add = useStore((s) => s.addToCart);
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");

  const productOf = (i: ListItem) => products.find((p) => p.id === i.productId);
  const estimate = useMemo(() => items.filter((i) => !i.done).reduce((s, i) => s + (productOf(i)?.price ?? 0) * i.quantity, 0), [items, products]); // eslint-disable-line react-hooks/exhaustive-deps
  const addable = items.filter((i) => !i.done && (productOf(i)?.stock ?? 0) > 0);

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    const p = matchProduct(clean, products);
    setItems([{ id: `li-${Date.now()}`, text: p?.name ?? clean, quantity: 1, done: false, productId: p?.id }, ...items]);
    setText("");
  }

  function plan(idea: string) {
    const result = suggestList(idea, products);
    if (!result) {
      toast.error("I do not have a plan for that yet. Try one of the suggestions.");
      return;
    }
    const fresh = result.items.filter((p) => !items.some((x) => x.productId === p.id)).map((p, i) => ({ id: `li-${Date.now()}-${i}`, text: p.name, quantity: 1, done: false, productId: p.id }));
    setItems([...fresh, ...items]);
    toast.success(`Added ${fresh.length} items for ${result.title}`);
    setPrompt("");
  }

  const update = (id: string, patch: Partial<ListItem>) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div>
      <PageHeader title="Smart list" subtitle="Type anything. It finds the matching product, and shows the price and stock." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <form onSubmit={addItem} className="mb-4 flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item, such as tomatoes" aria-label="Add a list item" className="h-12 rounded-full px-5" />
            <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full" disabled={!text.trim()}><Plus className="size-4" />Add</Button>
          </form>
          {items.length === 0 ? (
            <EmptyState image="/images/products/carrot.svg" title="Your list is empty" body="Add items one by one, or generate a list from an idea." />
          ) : (
            <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const p = productOf(item);
                  return (
                    <Reorder.Item key={item.id} value={item} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60, height: 0 }} whileDrag={{ scale: 1.03, boxShadow: "0 18px 40px -18px rgba(6,78,59,.5)" }} style={{ touchAction: "pan-y" }} className={cn("flex cursor-grab items-center gap-2 rounded-2xl border bg-card p-2.5 sm:gap-3 sm:pr-3 active:cursor-grabbing", item.done && "opacity-55")}>
                      <GripVertical className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
                      <Checkbox checked={item.done} onCheckedChange={(on) => update(item.id, { done: Boolean(on) })} aria-label={`Mark ${item.text} as done`} />
                      {p ? <ProductImage src={p.image} alt="" className="size-11 shrink-0" /> : <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Sparkles className="size-4" aria-hidden /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="relative inline-block max-w-full truncate text-sm font-semibold">{item.text}<motion.span aria-hidden className="absolute top-1/2 left-0 h-px w-full origin-left bg-foreground" initial={false} animate={{ scaleX: item.done ? 1 : 0 }} /></p>
                        <p className="text-xs text-muted-foreground">{!p ? "No match in store" : p.stock <= 0 ? "Out of stock" : `${formatMoney(p.price)} · ${p.unit}${p.stock <= p.reorderLevel ? ` · only ${p.stock} left` : ""}`}</p>
                      </div>
                      {p && <QuantityStepper size="sm" value={item.quantity} max={Math.max(p.stock, 1)} label={item.text} onChange={(n) => (n <= 0 ? setItems(items.filter((x) => x.id !== item.id)) : update(item.id, { quantity: n }))} />}
                      <button type="button" className={cn("size-9 place-items-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-700", p ? "hidden sm:grid" : "grid")} onClick={() => setItems(items.filter((x) => x.id !== item.id))} aria-label={`Delete ${item.text}`}><Trash2 className="size-4" aria-hidden /></button>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
        <aside className="space-y-4">
          <Panel title={<span className="flex items-center gap-2"><Wand2 className="size-4 text-primary" aria-hidden />Generate from an idea</span>}>
            <SimulatedAiBadge className="mb-3" />
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); plan(prompt); }}>
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What are you planning?" aria-label="What are you planning?" />
              <Button type="submit" variant="secondary" disabled={!prompt.trim()}>Go</Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-1.5">{IDEAS.map((i) => <motion.button key={i} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className="rounded-full border px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary" onClick={() => plan(i)}>{i}</motion.button>)}</div>
          </Panel>
          <Panel title="To buy">
            <p className="font-display text-4xl font-semibold tabular-nums">{formatMoney(estimate)}</p>
            <p className="mb-4 text-xs text-muted-foreground">Estimate for {addable.length} matched items still to buy</p>
            <Button className="w-full rounded-full" disabled={!addable.length} onClick={() => { addable.forEach((i) => add(i.productId!, i.quantity)); setItems(items.map((i) => (addable.includes(i) ? { ...i, done: true } : i))); toast.success("Added to your basket"); }}><ShoppingBasket className="size-4" />Add all to basket</Button>
            <Button asChild variant="ghost" className="mt-1 w-full rounded-full"><Link to="/shop/cart">View basket</Link></Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
