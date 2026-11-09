import { motion } from "framer-motion";
import { Check, KeyRound, Phone, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/components/Invoice";
import { MapView } from "@/components/MapView";
import { EmptyState, PageHeader, PaymentBadge, ProductImage, StatusBadge } from "@/components/shared";
import { formatDateTime, formatMoney, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { OrderStatus } from "@/types";

const FLOW: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];
const PROGRESS: Partial<Record<OrderStatus, number>> = { PLACED: 0, CONFIRMED: 0.05, PACKED: 0.14, OUT_FOR_DELIVERY: 0.62, DELIVERED: 1 };

export default function OrderDetail() {
  const { id } = useParams();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const customerId = useStore((s) => s.session?.customerId);
  const cancel = useStore((s) => s.cancelMyOrder);
  const add = useStore((s) => s.addToCart);

  if (!order || order.customerId !== customerId) {
    return <EmptyState image="/images/products/potato.svg" title="We could not find that order" body="It may belong to a different account." action={<Button asChild className="rounded-full"><Link to="/shop/orders">Back to orders</Link></Button>} />;
  }

  const current = FLOW.indexOf(order.status);
  const cancelled = order.status === "CANCELLED";
  const eventAt = (s: OrderStatus) => order.events.find((e) => e.status === s)?.at;
  const showCode = order.status === "OUT_FOR_DELIVERY" && order.otp;

  return (
    <div>
      <PageHeader
        title={`Order ${order.number}`}
        subtitle={`Placed ${formatDateTime(order.placedAt)}${order.slot ? ` · Slot: ${order.slot}` : ""}`}
        actions={<>
          <StatusBadge status={order.status} />
          {order.status === "PLACED" && <Button variant="outline" className="rounded-full" onClick={() => cancel(order.id).then(() => toast.success("Order cancelled, and items returned to stock")).catch((e: Error) => toast.error(e.message))}>Cancel order</Button>}
          <Button variant="outline" className="rounded-full" onClick={() => { order.lines.forEach((l) => add(l.productId, l.quantity)); toast.success("Items added to your basket"); }}><RotateCcw className="size-4" />Order again</Button>
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {order.channel === "ONLINE" && !cancelled && (
            <section className="overflow-hidden rounded-3xl border bg-card">
              <MapView progress={PROGRESS[order.status] ?? 0} label={`Schematic map. Order status: ${STATUS_LABEL[order.status]}`} className="h-72 rounded-none border-0 md:h-96" />
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">Illustrated map. The marker shows your order's status, not a GPS position.</p>
            </section>
          )}

          {showCode && (
            <motion.section initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0b2e23] p-5 text-white">
              <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/10"><KeyRound className="size-5" aria-hidden /></span><div><p className="font-semibold">Your delivery code</p><p className="text-xs text-emerald-50/70">Share it only when the driver hands you the order.</p></div></div>
              <p className="font-mono text-3xl font-bold tracking-[0.3em]" aria-label={`Code ${order.otp!.split("").join(" ")}`}>{order.otp}</p>
            </motion.section>
          )}

          {order.channel === "ONLINE" && (
            <section className="rounded-3xl border bg-card p-5" aria-label="Order progress">
              <h2 className="mb-4 text-xl font-medium">{cancelled ? "This order was cancelled" : "Progress"}</h2>
              {!cancelled && (
                <ol className="space-y-0">
                  {FLOW.map((s, i) => {
                    const done = i <= current;
                    return (
                      <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
                        {i < FLOW.length - 1 && <span className="absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 overflow-hidden bg-muted"><motion.span className="block size-full origin-top bg-primary" initial={{ scaleY: 0 }} animate={{ scaleY: i < current ? 1 : 0 }} transition={{ duration: 0.5, delay: i * 0.18 }} /></span>}
                        <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 340, damping: 18, delay: i * 0.12 }} className={cn("relative grid size-8 shrink-0 place-items-center rounded-full border-2", done ? "border-primary bg-primary text-white" : "bg-card text-muted-foreground")}>
                          {done ? <Check className="size-4" aria-hidden /> : <span className="text-xs font-bold">{i + 1}</span>}
                          {i === current && order.status !== "DELIVERED" && <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [1, 1.7], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
                        </motion.span>
                        <div className="pt-1"><p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>{STATUS_LABEL[s]}</p>{eventAt(s) && <p className="text-xs text-muted-foreground">{formatDateTime(eventAt(s)!)}</p>}</div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {order.assignment && !cancelled && <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><Phone className="size-4 text-primary" aria-hidden />Delivered by <strong>{order.assignment.driverName}</strong></p>}
            </section>
          )}

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="mb-3 text-xl font-medium">Items</h2>
            <ul className="divide-y">
              {order.lines.map((l) => <li key={l.name} className="flex items-center gap-3 py-2.5"><ProductImage src={l.image} alt="" className="size-12 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{l.name}</p><p className="text-xs text-muted-foreground">{l.unit} · {l.quantity} × {formatMoney(l.price)}</p></div><p className="text-sm font-bold tabular-nums">{formatMoney(l.price * l.quantity)}</p></li>)}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          {order.address && <section className="rounded-3xl border bg-card p-5 text-sm"><h2 className="mb-1 font-semibold">Delivering to</h2><p className="text-muted-foreground">{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city} {order.address.postalCode}</p><p className="mt-3 flex items-center justify-between font-semibold">Payment: {order.payment.method}<PaymentBadge status={order.payment.status} /></p></section>}
          <Invoice order={order} />
        </aside>
      </div>
    </div>
  );
}
