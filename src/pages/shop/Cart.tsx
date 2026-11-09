import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Trash2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion";
import { EmptyState, PageHeader, ProductImage, QuantityStepper } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { computeTotals, deliveryFeeFor } from "@/lib/pricing";
import { useStore } from "@/store";

export default function Cart() {
  const products = useStore((s) => s.products);
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setCartQty);
  const settings = useStore((s) => s.settings);
  const navigate = useNavigate();
  const lines = Object.entries(cart).flatMap(([id, quantity]) => {
    const product = products.find((p) => p.id === id);
    return product ? [{ product, quantity }] : [];
  });
  const priced = lines.map((l) => ({ price: l.product.price, taxRate: l.product.taxRate, quantity: l.quantity }));
  const subtotal = computeTotals(priced, 0, 0).subtotal;
  const totals = computeTotals(priced, 0, deliveryFeeFor(subtotal, settings));
  const toFree = Math.max(0, settings.freeDeliveryOver - subtotal);
  const progress = Math.min(1, subtotal / settings.freeDeliveryOver);
  const saved = lines.reduce((s, l) => s + (l.product.mrp - l.product.price) * l.quantity, 0);

  if (!lines.length) {
    return <EmptyState image="/images/scenes/market-crate.svg" title="Your basket is empty" body="Fill it with something fresh, or ask the assistant to plan a meal." action={<Button asChild className="rounded-full"><Link to="/shop/products">Start shopping</Link></Button>} />;
  }

  return (
    <div>
      <PageHeader title="Your basket" subtitle={`${lines.length} ${lines.length === 1 ? "product" : "products"}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {lines.map(({ product: p, quantity }) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 90, height: 0, marginBottom: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="overflow-hidden">
                <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 sm:gap-4">
                  <ProductImage src={p.image} alt="" className="size-20 shrink-0 rounded-xl bg-muted/60 p-1.5" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/shop/products/${p.slug}`} className="line-clamp-1 font-semibold hover:text-primary">{p.name}</Link>
                    <p className="text-xs text-muted-foreground">{p.unit} · {formatMoney(p.price)} each</p>
                    {quantity >= p.stock && <p className="text-xs font-semibold text-amber-800">That is all we have</p>}
                    <div className="mt-2 flex items-center gap-2 sm:hidden"><QuantityStepper size="sm" value={quantity} max={p.stock} label={p.name} onChange={(n) => setQty(p.id, n)} /></div>
                  </div>
                  <div className="hidden sm:block"><QuantityStepper value={quantity} max={p.stock} label={p.name} onChange={(n) => setQty(p.id, n)} /></div>
                  <p className="w-20 text-right font-bold tabular-nums">{formatMoney(p.price * quantity)}</p>
                  <motion.button whileHover={{ rotate: -10, scale: 1.1 }} whileTap={{ scale: 0.85 }} type="button" className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-700" onClick={() => setQty(p.id, 0)} aria-label={`Remove ${p.name}`}><Trash2 className="size-4" aria-hidden /></motion.button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <motion.aside layout className="h-fit space-y-4 rounded-3xl border bg-card p-5 lg:sticky lg:top-32">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-primary" aria-hidden />{toFree > 0 ? `${formatMoney(toFree)} away from free delivery` : "You have earned free delivery"}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery"><motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700" animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{totals.deliveryFee ? formatMoney(totals.deliveryFee) : "Free"}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>GST included</dt><dd className="tabular-nums">{formatMoney(totals.tax)}</dd></div>
            {saved > 0 && <div className="flex justify-between font-semibold text-primary"><dt>You save on MRP</dt><dd className="tabular-nums">{formatMoney(saved)}</dd></div>}
            <div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>Total</dt><dd><CountUp value={totals.total} format={formatMoney} /></dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">Have a coupon? Add it at checkout.</p>
          <Button size="lg" className="group h-12 w-full rounded-full" onClick={() => navigate("/shop/checkout")}>Go to checkout<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Button>
        </motion.aside>
      </div>
    </div>
  );
}
