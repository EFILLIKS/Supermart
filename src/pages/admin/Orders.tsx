import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, PageHeader, Panel, PaymentBadge, ProductImage, StatusBadge } from "@/components/shared";
import { formatDateTime, formatMoney, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { Order, OrderStatus } from "@/types";

const FILTERS: (OrderStatus | "ALL")[] = ["ALL", "PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { PLACED: "CONFIRMED", CONFIRMED: "PACKED" };

export function OrderActions({ order }: { order: Order }) {
  const setStatus = useStore((s) => s.setOrderStatus);
  const assign = useStore((s) => s.assignDriver);
  const employees = useStore((s) => s.employees);
  const drivers = employees.filter((e) => e.role === "DELIVERY" && e.active);
  const act = (status: OrderStatus) => setStatus(order.id, status).then(() => toast.success(`${order.number} is now ${STATUS_LABEL[status].toLowerCase()}`)).catch((e: Error) => toast.error(e.message));
  const next = NEXT[order.status];
  const canAssign = order.channel === "ONLINE" && ["CONFIRMED", "PACKED"].includes(order.status);
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {next && <Button size="sm" className="rounded-full" onClick={() => void act(next)}>Mark {STATUS_LABEL[next].toLowerCase()}</Button>}
      {canAssign && (
        <Select value={order.assignment?.status !== "FAILED" ? order.assignment?.driverId ?? "" : ""} onValueChange={(v) => assign(order.id, v).then(() => toast.success("Driver assigned")).catch((e: Error) => toast.error(e.message))}>
          <SelectTrigger size="sm" className="w-40 rounded-full" aria-label={`Assign driver to ${order.number}`}><SelectValue placeholder="Assign driver" /></SelectTrigger>
          <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {["PLACED", "CONFIRMED", "PACKED"].includes(order.status) && <Button size="sm" variant="ghost" className="rounded-full text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => void act("CANCELLED")}>Cancel</Button>}
    </div>
  );
}

export default function Orders() {
  const orders = useStore((s) => s.orders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [channel, setChannel] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = orders.find((o) => o.id === openId);
  const rows = useMemo(() => orders.filter((o) => (filter === "ALL" || o.status === filter) && (channel === "all" || o.channel === channel) && `${o.number} ${o.customerName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60), [orders, filter, channel, q]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Online and in-store, in one queue." />
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const count = f === "ALL" ? orders.length : orders.filter((o) => o.status === f).length;
          return (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="relative shrink-0 rounded-full border bg-card px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap">
              {filter === f && <motion.span layoutId="order-filter" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className={cn("relative", filter === f && "text-white")}>{f === "ALL" ? "All" : STATUS_LABEL[f]} <span className="opacity-70">{count}</span></span>
            </button>
          );
        })}
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order number or customer" aria-label="Search orders" className="pl-9" /></div>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-40" aria-label="Channel"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All channels</SelectItem><SelectItem value="ONLINE">Online</SelectItem><SelectItem value="POS">In store</SelectItem></SelectContent>
          </Select>
        </div>
        <DataTable<Order>
          rows={rows} rowKey={(o) => o.id} empty="No orders match those filters." onRowClick={(o) => setOpenId(o.id)}
          columns={[
            { header: "Order", cell: (o) => <span><span className="block font-semibold">{o.number}</span><span className="text-xs text-muted-foreground">{formatDateTime(o.placedAt)}</span></span> },
            { header: "Customer", cell: (o) => o.customerName },
            { header: "Channel", cell: (o) => (o.channel === "POS" ? "In store" : "Online") },
            { header: "Total", cell: (o) => <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span> },
            { header: "Payment", cell: (o) => <span className="flex items-center gap-1.5 text-xs">{o.payment.method}<PaymentBadge status={o.payment.status} /></span> },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Actions", cell: (o) => <OrderActions order={o} /> },
          ]}
        />
      </Panel>
      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <DialogHeader><DialogTitle>Order {open.number}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={open.status} /><OrderActions order={open} /></div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="font-semibold">{open.customerName}</p><p className="text-muted-foreground">{open.customerPhone}</p></div>
                {open.address && <p className="text-muted-foreground">{open.address.line1}, {open.address.line2 ?? ""} {open.address.city} {open.address.postalCode}</p>}
                {open.assignment && <p>Driver: <strong>{open.assignment.driverName}</strong>{open.assignment.failureReason ? ` (last attempt failed: ${open.assignment.failureReason})` : ""}</p>}
                {open.slot && <p>Slot: <strong>{open.slot}</strong></p>}
              </div>
              <ul className="divide-y">{open.lines.map((l) => <li key={l.name} className="flex items-center gap-3 py-2"><ProductImage src={l.image} alt="" className="size-10 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm">{l.name} × {l.quantity}</span><span className="text-sm font-semibold tabular-nums">{formatMoney(l.price * l.quantity)}</span></li>)}</ul>
              <dl className="space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(open.subtotal)}</dd></div>
                {open.discount > 0 && <div className="flex justify-between"><dt>Discount{open.couponCode ? ` (${open.couponCode})` : ""}</dt><dd>-{formatMoney(open.discount)}</dd></div>}
                {open.deliveryFee > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{formatMoney(open.deliveryFee)}</dd></div>}
                <div className="flex justify-between text-muted-foreground"><dt>GST included</dt><dd>{formatMoney(open.tax)}</dd></div>
                <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatMoney(open.total)}</dd></div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
