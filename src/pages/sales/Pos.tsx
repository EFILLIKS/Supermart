import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, CreditCard, Percent, ScanBarcode, Search, ShoppingCart, Smartphone, Trash2, UserPlus, UserRound, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Invoice } from "@/components/Invoice";
import { Confetti } from "@/components/motion";
import { EmptyState, Field, ProductImage, QuantityStepper } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { computeTotals } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { Customer, Order, PaymentMethod } from "@/types";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "ONLINE", label: "Online", icon: CreditCard },
];
const QUICK_DISCOUNTS = [0, 5, 10, 15];

function ScannerPanel({ onScan, lastScan }: { onScan: (code: string) => void; lastScan: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const products = useStore((s) => s.products);

  useEffect(() => {
    ref.current?.focus();
    // F2 returns focus to the scanner from anywhere on the page.
    const onKey = (e: KeyboardEvent) => { if (e.key === "F2") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0b2e23] p-4 text-white">
      <div className="pointer-events-none absolute inset-x-4 inset-y-0 overflow-hidden" aria-hidden><span className="absolute inset-x-0 h-0.5 animate-scan bg-emerald-300 shadow-[0_0_14px_3px_rgba(110,231,183,.8)]" /></div>
      <form className="relative flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onScan(code.trim()); setCode(""); } }}>
        <div className="relative flex-1">
          <ScanBarcode className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-emerald-200" aria-hidden />
          <Input ref={ref} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="Barcode" placeholder="Scan or type a barcode, then press Enter" className="h-11 border-white/15 bg-white/10 pl-10 text-white placeholder:text-emerald-100/60" />
        </div>
        <Button type="button" variant="secondary" className="h-11" onClick={() => { const p = products.filter((x) => x.active && x.stock > 0); onScan(p[Math.floor(Math.random() * p.length)].barcode); }}><Zap className="size-4" />Test scan</Button>
      </form>
      <p className="relative mt-2 text-xs text-emerald-100/70">A USB or Bluetooth scanner works here, because it types like a keyboard. Press F2 to refocus. Camera scanning is not included.</p>
      <AnimatePresence>
        {lastScan && <motion.p key={lastScan} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative mt-1 text-xs font-semibold text-emerald-200">{lastScan}</motion.p>}
      </AnimatePresence>
    </div>
  );
}

function CustomerPicker({ customer, onPick }: { customer: Customer | null; onPick: (c: Customer | null) => void }) {
  const customers = useStore((s) => s.customers);
  const addCustomer = useStore((s) => s.addWalkInCustomer);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const matches = q.length >= 2 ? customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];

  if (customer) {
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 rounded-2xl bg-accent p-2.5 text-sm">
        <UserRound className="size-4 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate"><strong>{customer.name}</strong> · {customer.loyaltyPoints} points</span>
        <button type="button" onClick={() => onPick(null)} aria-label="Remove customer"><X className="size-4" /></button>
      </motion.div>
    );
  }
  return (
    <div className="relative">
      <UserRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={q} onChange={(e) => { setQ(e.target.value); setAdding(false); }} placeholder="Customer name or phone (optional)" aria-label="Find a customer" className="pl-9" />
      <AnimatePresence>
        {q.length >= 2 && (
          <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border bg-popover shadow-lg">
            {matches.map((c) => <li key={c.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { onPick(c); setQ(""); }}><strong>{c.name}</strong> <span className="text-muted-foreground">{c.phone}</span></button></li>)}
            <li className="border-t">
              {adding ? (
                <form className="flex gap-2 p-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addCustomer(name.trim(), q).then(() => { toast.success("Customer added"); setQ(""); setName(""); setAdding(false); }).catch((err: Error) => toast.error(err.message)); }}>
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="New customer name" /><Button type="submit" size="sm">Add</Button>
                </form>
              ) : <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-accent" onClick={() => setAdding(true)}><UserPlus className="size-4" aria-hidden />New customer with "{q}"</button>}
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Pos() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const createSale = useStore((s) => s.createPosSale);
  const [bill, setBill] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<Order | null>(null);

  const visible = useMemo(() => products.filter((p) => p.active && (cat === "all" || p.categoryId === cat) && `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())), [products, cat, q]);
  const lines = Object.entries(bill).flatMap(([id, quantity]) => { const p = products.find((x) => x.id === id); return p ? [{ p, quantity, price: p.price, taxRate: p.taxRate }] : []; });
  const subtotal = computeTotals(lines, 0, 0).subtotal;
  const totals = computeTotals(lines, (subtotal * discount) / 100, 0);
  const change = Number(tendered) - totals.total;

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return false;
    if ((bill[id] ?? 0) >= p.stock) { toast.error(`Only ${p.stock} of ${p.name} in stock`); return false; }
    setBill((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 }));
    return true;
  }

  function scan(code: string) {
    const p = products.find((x) => x.barcode === code && x.active);
    if (!p) { setLastScan(`Barcode ${code} is not in the catalogue.`); toast.error("Barcode not found"); return; }
    if (addProduct(p.id)) setLastScan(`Added ${p.name}, ${formatMoney(p.price)} (barcode ${code})`);
  }

  const setQty = (id: string, n: number) => setBill((b) => {
    const next = { ...b };
    if (n <= 0) delete next[id];
    else next[id] = n;
    return next;
  });

  async function charge() {
    setError(undefined);
    if (method === "CASH" && tendered && change < 0) { setError(`The customer is ${formatMoney(-change)} short.`); return; }
    try {
      const id = await createSale({ items: lines.map((l) => ({ productId: l.p.id, quantity: l.quantity })), method, discountPercent: discount, customerId: customer?.id ?? null, reference: reference.trim() || undefined });
      setDone(useStore.getState().orders.find((o) => o.id === id) ?? null);
      setBill({}); setCustomer(null); setDiscount(0); setTendered(""); setReference(""); setLastScan(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-4">
        <ScannerPanel onScan={scan} lastScan={lastScan} />
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-52 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="pl-9" /></div>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className="relative shrink-0 rounded-full border bg-card px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap">
              {cat === c.id && <motion.span layoutId="pos-cat" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className={cn("relative", cat === c.id && "text-white")}>{c.name}</span>
            </button>
          ))}
        </div>
        {visible.length === 0 ? <EmptyState icon={Search} title="No products found" body="Try another word or category." /> : (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((p) => (
                <motion.button key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} type="button" disabled={p.stock <= 0} onClick={() => addProduct(p.id)} aria-label={`Add ${p.name}, ${formatMoney(p.price)}`} className="relative rounded-2xl border bg-card p-2.5 text-left transition-colors hover:border-primary disabled:opacity-50">
                  <ProductImage src={p.image} alt="" className="mx-auto aspect-square w-full max-w-24" />
                  <p className="mt-1 line-clamp-1 text-xs font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.unit}</p>
                  <p className="mt-0.5 flex items-center justify-between text-sm font-bold">{formatMoney(p.price)}<span className={cn("text-[11px] font-medium", p.stock <= p.reorderLevel ? "text-amber-800" : "text-muted-foreground")}>{p.stock <= 0 ? "None left" : `${p.stock} left`}</span></p>
                  <AnimatePresence>
                    {bill[p.id] > 0 && <motion.span key={bill[p.id]} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 520, damping: 16 }} className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">{bill[p.id]}</motion.span>}
                  </AnimatePresence>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <aside className="h-fit space-y-3 rounded-3xl border bg-card p-4 xl:sticky xl:top-5" aria-label="Current bill">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-medium">Current bill</h1>{lines.length > 0 && <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50" onClick={() => setBill({})}><Trash2 className="size-3.5" />Clear</Button>}</div>
        <CustomerPicker customer={customer} onPick={setCustomer} />
        <div className="max-h-[32dvh] min-h-24 space-y-1.5 overflow-y-auto">
          {lines.length === 0 && <div className="grid h-24 place-items-center text-center text-sm text-muted-foreground"><span><ShoppingCart className="mx-auto mb-1 size-5" aria-hidden />Scan or tap a product to begin</span></div>}
          <AnimatePresence initial={false}>
            {lines.map(({ p, quantity }) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, x: 24, backgroundColor: "#d1fae5" }} animate={{ opacity: 1, x: 0, backgroundColor: "#ffffff" }} exit={{ opacity: 0, x: -24, height: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 overflow-hidden rounded-xl py-1 pr-1">
                <ProductImage src={p.image} alt="" className="size-9 shrink-0" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{formatMoney(p.price)}</p></div>
                <QuantityStepper size="sm" value={quantity} max={p.stock} label={p.name} onChange={(n) => setQty(p.id, n)} />
                <p className="w-14 text-right text-xs font-bold tabular-nums">{formatMoney(p.price * quantity)}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5 border-t pt-3">
          <Percent className="size-4 text-muted-foreground" aria-hidden /><span className="text-xs font-semibold">Discount</span>
          <div className="ml-auto flex gap-1" role="group" aria-label="Discount">
            {QUICK_DISCOUNTS.map((d) => <button key={d} type="button" aria-pressed={discount === d} onClick={() => setDiscount(d)} className={cn("rounded-lg px-2.5 py-1 text-xs font-bold transition-colors", discount === d ? "bg-primary text-white" : "bg-muted hover:bg-accent")}>{d}%</button>)}
          </div>
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between text-primary"><dt>Discount</dt><dd className="tabular-nums">-{formatMoney(totals.discount)}</dd></div>}
          <div className="flex justify-between text-xs text-muted-foreground"><dt>GST included</dt><dd className="tabular-nums">{formatMoney(totals.tax)}</dd></div>
          <div className="flex items-baseline justify-between pt-1"><dt className="font-bold">Total</dt><dd className="font-display text-3xl font-semibold tabular-nums">{formatMoney(totals.total)}</dd></div>
        </dl>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
          {METHODS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className={cn("relative flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-xs font-bold transition-colors", method === m.id ? "border-primary bg-accent text-primary" : "hover:border-primary/50")}>
              <m.icon className="size-5" aria-hidden />{m.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {method === "CASH" ? (
            <motion.div key="cash" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field label="Cash received (optional)" htmlFor="tendered" hint={tendered && change >= 0 ? `Give back ${formatMoney(change)}` : undefined}><Input id="tendered" type="number" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} /></Field>
            </motion.div>
          ) : (
            <motion.div key="ref" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field label="Payment reference (optional)" htmlFor="reference" hint="Confirm the money arrived before completing the sale."><Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
            </motion.div>
          )}
        </AnimatePresence>
        {error && <motion.p role="alert" animate={{ x: [0, -7, 7, -4, 4, 0] }} transition={{ duration: 0.35 }} className="rounded-xl bg-rose-50 p-2.5 text-sm text-rose-800">{error}</motion.p>}
        <motion.div whileTap={{ scale: 0.98 }}><Button size="lg" className="h-13 w-full rounded-2xl text-base" disabled={!lines.length} onClick={() => void charge()}>Complete sale · {formatMoney(totals.total)}</Button></motion.div>
      </aside>

      <Dialog open={Boolean(done)} onOpenChange={(v) => !v && setDone(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <Confetti count={26} />
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-primary" aria-hidden />Sale complete</DialogTitle></DialogHeader>
          {done && <Invoice order={done} />}
          <Button variant="secondary" onClick={() => setDone(null)}>Start next bill</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
