import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Banknote, Check, CreditCard, FlaskConical, LoaderCircle, MapPin, Smartphone, TicketPercent } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Confetti } from "@/components/motion";
import { EmptyState, Field, PageHeader, ProductImage, SuccessTick } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { checkCoupon, computeTotals, deliveryFeeFor } from "@/lib/pricing";
import { isLive } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { PaymentMethod } from "@/types";
import { AddressForm } from "./Account";

const STEPS = ["Address", "Delivery slot", "Payment"];
const SLOTS = ["Today, 6 to 8 pm", "Today, 8 to 10 pm", "Tomorrow, 8 to 10 am", "Tomorrow, 10 am to 12 pm", "Tomorrow, 6 to 8 pm"];
const METHODS: { id: PaymentMethod; label: string; note: string; icon: typeof CreditCard }[] = [
  { id: "UPI", label: "UPI", note: "Pay from any UPI app", icon: Smartphone },
  { id: "CARD", label: "Card", note: "Credit or debit", icon: CreditCard },
  { id: "COD", label: "Cash on delivery", note: "Pay the driver at the door", icon: Banknote },
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-7 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={i === step ? "step" : undefined}>
          <motion.span animate={{ backgroundColor: i <= step ? "#047857" : "#f2f1ea", color: i <= step ? "#ffffff" : "#5b6b62", scale: i === step ? 1.12 : 1 }} className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold">
            {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
          </motion.span>
          <span className={cn("hidden text-sm font-semibold sm:inline", i > step && "text-muted-foreground")}>{s}</span>
          {i < STEPS.length - 1 && <span className="relative h-0.5 flex-1 overflow-hidden rounded bg-muted"><motion.span className="absolute inset-0 origin-left bg-primary" initial={false} animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.45 }} /></span>}
        </li>
      ))}
    </ol>
  );
}

export default function Checkout() {
  const store = useStore();
  const navigate = useNavigate();
  const customer = store.customers.find((c) => c.id === store.session?.customerId);
  const [step, setStep] = useState(0);
  const [addressId, setAddressId] = useState(() => customer?.addresses.find((a) => a.isDefault)?.id ?? customer?.addresses[0]?.id ?? "");
  const [slot, setSlot] = useState(SLOTS[0]);
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string>();
  const [couponError, setCouponError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [payError, setPayError] = useState<string>();
  const [phase, setPhase] = useState<"idle" | "paying" | "done">("idle");
  const [orderId, setOrderId] = useState("");

  const lines = useMemo(() => Object.entries(store.cart).flatMap(([id, quantity]) => {
    const p = store.products.find((x) => x.id === id);
    return p ? [{ p, quantity, price: p.price, taxRate: p.taxRate }] : [];
  }), [store.cart, store.products]);
  const subtotal = computeTotals(lines, 0, 0).subtotal;
  const applied = coupon ? checkCoupon(coupon, store.coupons, subtotal) : null;
  const discount = applied?.ok ? applied.discount : 0;
  const totals = computeTotals(lines, discount, deliveryFeeFor(subtotal - discount, store.settings));

  if (phase === "done") {
    return (
      <div className="relative mx-auto flex max-w-lg flex-col items-center py-14 text-center">
        <Confetti />
        <SuccessTick />
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 text-4xl font-medium">Order placed</motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-2 text-muted-foreground">It is already in the store's queue. You can follow every step from here.</motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex gap-3">
          <Button asChild size="lg" className="rounded-full"><Link to={`/shop/orders/${orderId}`}>Track this order</Link></Button>
          <Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/shop">Keep shopping</Link></Button>
        </motion.div>
      </div>
    );
  }

  if (!lines.length) {
    return <EmptyState image="/images/scenes/market-crate.svg" title="Nothing to check out" body="Add something to your basket first." action={<Button asChild className="rounded-full"><Link to="/shop/products">Browse products</Link></Button>} />;
  }

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    const check = checkCoupon(code, store.coupons, subtotal);
    if (check.ok) { setCoupon(code); setCouponError(undefined); } else { setCoupon(undefined); setCouponError(check.reason); }
  }

  function validatePayment() {
    if (method === "UPI" && !/^[\w.-]+@[\w.-]+$/.test(upi.trim())) return "Enter a UPI ID such as name@bank.";
    if (method === "CARD") {
      if (card.number.replace(/\s/g, "").length < 12) return "Enter the full card number.";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Enter the expiry as MM/YY.";
      if (!/^\d{3,4}$/.test(card.cvv)) return "Enter the 3 or 4 digit security code.";
    }
    return undefined;
  }

  async function pay() {
    const problem = validatePayment();
    setFieldError(problem);
    setPayError(undefined);
    if (problem) return;
    setPhase("paying");
    await new Promise((r) => setTimeout(r, 1400));
    // Lets anyone preview the failure state without a gateway.
    if (!isLive && method === "UPI" && upi.trim().toLowerCase().startsWith("fail@")) {
      setPhase("idle");
      setPayError("The test payment was declined. Nothing was charged, and your basket is safe. Try another UPI ID.");
      return;
    }
    try {
      const id = await store.placeOrder({ addressId, method, coupon, slot, reference: method === "COD" ? undefined : `TEST-${Date.now().toString(36).toUpperCase()}` });
      setOrderId(id);
      setPhase("done");
    } catch (e) {
      setPhase("idle");
      setPayError((e as Error).message);
    }
  }

  const canNext = step === 0 ? Boolean(addressId) : true;

  return (
    <div>
      <PageHeader title="Checkout" />
      <div className="grid gap-7 lg:grid-cols-[1fr_370px]">
        <div className="rounded-3xl border bg-card p-5 md:p-7">
          <Stepper step={step} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -26 }} transition={{ duration: 0.26 }}>
              {step === 0 && (
                <div className="space-y-3">
                  <h2 className="text-2xl font-medium">Where should we deliver?</h2>
                  {customer?.addresses.length === 0 && <p className="text-sm text-muted-foreground">Add your first address to continue.</p>}
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery address">
                    {customer?.addresses.map((a) => (
                      <motion.button key={a.id} type="button" role="radio" aria-checked={addressId === a.id} whileTap={{ scale: 0.98 }} onClick={() => setAddressId(a.id)} className={cn("relative rounded-2xl border p-4 text-left transition-colors", addressId === a.id ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:border-primary/50")}>
                        <span className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-primary" aria-hidden />{a.label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postalCode}</span>
                      </motion.button>
                    ))}
                  </div>
                  <AddressForm />
                </div>
              )}
              {step === 1 && (
                <div className="space-y-3">
                  <h2 className="text-2xl font-medium">When suits you?</h2>
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery slot">
                    {SLOTS.map((s) => <motion.button key={s} type="button" role="radio" aria-checked={slot === s} whileTap={{ scale: 0.98 }} onClick={() => setSlot(s)} className={cn("rounded-2xl border p-4 text-left text-sm font-semibold transition-colors", slot === s ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:border-primary/50")}>{s}</motion.button>)}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-medium">How would you like to pay?</h2>
                  <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />{isLive ? "No payment gateway is connected yet. Online orders stay marked as pending until one is." : "Test mode: no gateway is connected and no money moves. Please do not enter real card details. To preview a declined payment, use the UPI ID fail@test."}</p>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
                    {METHODS.map((m) => <motion.button key={m.id} type="button" role="radio" aria-checked={method === m.id} whileTap={{ scale: 0.97 }} onClick={() => { setMethod(m.id); setFieldError(undefined); }} className={cn("rounded-2xl border p-4 text-left transition-colors", method === m.id ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:border-primary/50")}><m.icon className="size-5 text-primary" aria-hidden /><span className="mt-2 block text-sm font-bold">{m.label}</span><span className="block text-xs text-muted-foreground">{m.note}</span></motion.button>)}
                  </div>
                  <AnimatePresence mode="wait">
                    {method === "UPI" && <motion.div key="upi" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><Field label="UPI ID" htmlFor="upi" error={fieldError}><Input id="upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" autoComplete="off" /></Field></motion.div>}
                    {method === "CARD" && (
                      <motion.div key="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                        <Field label="Card number" htmlFor="cc"><Input id="cc" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} placeholder="4111 1111 1111 1111" autoComplete="off" /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Expiry" htmlFor="exp"><Input id="exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.slice(0, 5) })} placeholder="MM/YY" autoComplete="off" /></Field>
                          <Field label="Security code" htmlFor="cvv"><Input id="cvv" inputMode="numeric" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" autoComplete="off" /></Field>
                        </div>
                        {fieldError && <p role="alert" className="text-xs font-medium text-destructive">{fieldError}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {payError && <motion.p role="alert" initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{payError}</motion.p>}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-7 flex justify-between gap-3">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate("/shop/cart") : setStep(step - 1))}>{step === 0 ? "Back to basket" : "Back"}</Button>
            {step < 2 ? (
              <Button size="lg" className="rounded-full px-7" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Button size="lg" className="min-w-44 rounded-full px-7" disabled={phase === "paying"} onClick={() => void pay()}>
                {phase === "paying" ? <><LoaderCircle className="size-4 animate-spin" aria-hidden />Processing</> : method === "COD" ? "Place order" : `Pay ${formatMoney(totals.total)}`}
              </Button>
            )}
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border bg-card p-5 lg:sticky lg:top-32">
          <h2 className="text-xl font-medium">Order summary</h2>
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {lines.map(({ p, quantity }) => <li key={p.id} className="flex items-center gap-2 text-sm"><ProductImage src={p.image} alt="" className="size-10 shrink-0" /><span className="min-w-0 flex-1 truncate">{p.name} × {quantity}</span><span className="font-semibold tabular-nums">{formatMoney(p.price * quantity)}</span></li>)}
          </ul>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); applyCoupon(); }}>
            <div className="relative flex-1"><TicketPercent className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className="pl-9 uppercase" /></div>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
          <AnimatePresence>
            {couponError && <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs font-medium text-destructive">{couponError}</motion.p>}
            {applied?.ok && <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between rounded-xl bg-accent p-2.5 text-xs font-semibold text-primary"><span>{applied.coupon.code} saved you {formatMoney(discount)}</span><button type="button" className="underline" onClick={() => { setCoupon(undefined); setCouponInput(""); }}>Remove</button></motion.p>}
          </AnimatePresence>
          <dl className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-primary"><dt>Discount</dt><dd className="tabular-nums">-{formatMoney(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{totals.deliveryFee ? formatMoney(totals.deliveryFee) : "Free"}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>GST included</dt><dd className="tabular-nums">{formatMoney(totals.tax)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(totals.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
