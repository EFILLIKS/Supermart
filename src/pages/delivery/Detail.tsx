import { AnimatePresence, motion } from "framer-motion";
import { Banknote, FlaskConical, MapPin, Navigation, Phone, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/MapView";
import { Confetti } from "@/components/motion";
import { EmptyState, Field, PageHeader, Panel, ProductImage, StatusBadge, SuccessTick } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { isLive } from "@/lib/supabase";
import { useStore } from "@/store";

const LENGTH = 6;

function OtpEntry({ onSubmit, error, attemptKey, busy }: { onSubmit: (code: string) => void; error?: string; attemptKey: number; busy: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function put(i: number, value: string) {
    const clean = value.replace(/\D/g, "");
    const next = [...digits];
    if (clean.length > 1) {
      // A pasted code fills every box.
      clean.slice(0, LENGTH).split("").forEach((d, n) => { next[n] = d; });
      setDigits(next);
      refs.current[Math.min(clean.length, LENGTH - 1)]?.focus();
      return;
    }
    next[i] = clean;
    setDigits(next);
    if (clean && i < LENGTH - 1) refs.current[i + 1]?.focus();
  }

  const code = digits.join("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.length === LENGTH) { onSubmit(code); setDigits(Array(LENGTH).fill("")); refs.current[0]?.focus(); } }}>
      <motion.div key={attemptKey} className="flex justify-center gap-2" animate={error ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : {}} transition={{ duration: 0.45 }} role="group" aria-label="Delivery code">
        {digits.map((d, i) => (
          <motion.input
            key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete="one-time-code" maxLength={LENGTH} aria-label={`Digit ${i + 1}`}
            animate={{ scale: d ? [1, 1.12, 1] : 1, borderColor: d ? "#047857" : "#dcdcd1" }} transition={{ duration: 0.2 }}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }}
            className="size-12 rounded-xl border-2 bg-background text-center font-mono text-xl font-bold outline-none focus:ring-2 focus:ring-ring sm:size-13"
          />
        ))}
      </motion.div>
      {error && <p role="alert" className="mt-3 text-center text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="mt-4 w-full rounded-full" disabled={code.length !== LENGTH || busy}><ShieldCheck className="size-4" />{busy ? "Checking" : "Confirm delivery"}</Button>
    </form>
  );
}

export default function Detail() {
  const { id } = useParams();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const me = useStore((s) => s.session?.userId);
  const pickUp = useStore((s) => s.pickUp);
  const confirm = useStore((s) => s.confirmDelivery);
  const fail = useStore((s) => s.failDelivery);
  const [otpError, setOtpError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [justDelivered, setJustDelivered] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!order || order.assignment?.driverId !== me) {
    return <EmptyState icon={Truck} title="This order is not assigned to you" body="It may have been reassigned by the store." action={<Button asChild className="rounded-full"><Link to="/delivery/orders">Back to my orders</Link></Button>} />;
  }
  const a = order.assignment!;
  const address = order.address ? `${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}, ${order.address.city} ${order.address.postalCode}` : "";
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  async function submitOtp(code: string) {
    setBusy(true);
    try {
      const ok = await confirm(order!.id, code);
      if (ok) { setJustDelivered(true); setOtpError(undefined); }
      else { setOtpError("That code is not right. Ask the customer to check their order page."); setAttempt((n) => n + 1); }
    } catch (e) {
      setOtpError((e as Error).message);
      setAttempt((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title={`Drop ${order.number}`} subtitle={order.slot} actions={<StatusBadge status={order.status} />} />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <MapView progress={a.status === "DELIVERED" ? 1 : a.status === "PICKED_UP" ? 0.55 : 0.04} label={`Schematic route to ${order.customerName}`} className="h-72 md:h-96" />
          <p className="-mt-3 text-xs text-muted-foreground">Illustrated route for orientation. Use Navigate for live directions.</p>
          <Panel title="Items to hand over">
            <ul className="divide-y">{order.lines.map((l) => <li key={l.name} className="flex items-center gap-3 py-2"><ProductImage src={l.image} alt="" className="size-10 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm">{l.name}</span><span className="text-sm font-bold">× {l.quantity}</span></li>)}</ul>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Customer">
            <p className="font-semibold">{order.customerName}</p>
            <p className="mt-1 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{address}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="rounded-full"><a href={`tel:${order.customerPhone.replace(/\s/g, "")}`}><Phone className="size-4" />Call</a></Button>
              <Button asChild className="rounded-full"><a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation className="size-4" />Navigate</a></Button>
            </div>
            {order.payment.method === "COD" && order.status !== "DELIVERED" && <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-sm font-semibold text-amber-900"><Banknote className="size-4" aria-hidden />Collect {formatMoney(order.total)} in cash</p>}
          </Panel>

          <AnimatePresence mode="wait">
            {a.status === "ASSIGNED" && (
              <motion.div key="collect" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <Panel title="Collect from the store">
                  {order.status !== "PACKED" && <p className="mb-3 text-sm text-muted-foreground">The store is still preparing this order. You can collect it once it is packed.</p>}
                  <Button size="lg" className="w-full rounded-full" disabled={order.status !== "PACKED"} onClick={() => pickUp(order.id).then(() => toast.success("On your way. The customer can now see this.")).catch((e: Error) => toast.error(e.message))}><Truck className="size-4" />I have collected it</Button>
                </Panel>
              </motion.div>
            )}
            {a.status === "PICKED_UP" && (
              <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <Panel title="Confirm with the customer's code" subtitle="They see a 6-digit code on their order page.">
                  <OtpEntry onSubmit={(c) => void submitOtp(c)} error={otpError} attemptKey={attempt} busy={busy} />
                  {!isLive && order.otp && <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-900"><FlaskConical className="size-3.5" aria-hidden />Demo only, so you can test this alone. The code is {order.otp}</p>}
                  <Button variant="ghost" className="mt-2 w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => setFailOpen(true)}><TriangleAlert className="size-4" />I could not deliver this</Button>
                </Panel>
              </motion.div>
            )}
            {a.status === "DELIVERED" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative flex flex-col items-center rounded-3xl border bg-card p-8 text-center">
                {justDelivered && <Confetti />}
                <SuccessTick />
                <h2 className="mt-4 text-2xl font-medium">Delivered</h2>
                <p className="text-sm text-muted-foreground">You earned {formatMoney(a.earning)} on this drop.</p>
                <Button asChild variant="outline" className="mt-4 rounded-full"><Link to="/delivery/orders">Next drop</Link></Button>
              </motion.div>
            )}
            {a.status === "FAILED" && (
              <motion.div key="failed"><Panel title="Delivery attempt failed"><p className="text-sm text-muted-foreground">{a.failureReason}. The order is back with the store to reassign.</p></Panel></motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Why could you not deliver?</DialogTitle></DialogHeader>
          <div className="flex flex-wrap gap-2">{["Customer not available", "Wrong address", "Customer refused"].map((r) => <Button key={r} size="sm" variant={reason === r ? "default" : "outline"} className="rounded-full" onClick={() => setReason(r)}>{r}</Button>)}</div>
          <Field label="Reason" htmlFor="fail-reason"><Input id="fail-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFailOpen(false)}>Back</Button>
            <Button variant="destructive" disabled={!reason.trim()} onClick={() => fail(order.id, reason.trim()).then(() => { setFailOpen(false); toast.success("The store has been told"); }).catch((e: Error) => toast.error(e.message))}>Report it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
