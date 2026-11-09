import { AnimatePresence, motion } from "framer-motion";
import { Bike, IndianRupee, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/charts";
import { PageHeader, Panel, StatusBadge } from "@/components/shared";
import { formatDateTime, formatMoney, isSameDay } from "@/lib/format";
import { useStore } from "@/store";
import type { Order } from "@/types";

function DropCard({ order }: { order: Order }) {
  const assign = useStore((s) => s.assignDriver);
  const employees = useStore((s) => s.employees);
  const drivers = employees.filter((e) => e.role === "DELIVERY" && e.active);
  const canChange = ["CONFIRMED", "PACKED"].includes(order.status);
  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="rounded-2xl border bg-background p-3 text-sm">
      <div className="flex items-center justify-between gap-2"><strong>{order.number}</strong><StatusBadge status={order.status} /></div>
      <p className="mt-1 font-medium">{order.customerName}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{order.address?.line2 ?? order.address?.line1}, {order.address?.city} · {order.slot}</p>
      {order.assignment?.failureReason && order.assignment.status === "FAILED" && <p className="mt-1 text-xs font-semibold text-rose-700">Failed attempt: {order.assignment.failureReason}</p>}
      {canChange && (
        <Select value={order.assignment && order.assignment.status !== "FAILED" ? order.assignment.driverId : ""} onValueChange={(v) => assign(order.id, v).then(() => toast.success("Driver assigned")).catch((e: Error) => toast.error(e.message))}>
          <SelectTrigger size="sm" className="mt-2 w-full" aria-label={`Driver for ${order.number}`}><SelectValue placeholder="Assign a driver" /></SelectTrigger>
          <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {!canChange && order.assignment && <p className="mt-2 text-xs">With <strong>{order.assignment.driverName}</strong></p>}
    </motion.li>
  );
}

export default function Delivery() {
  const orders = useStore((s) => s.orders);
  const employees = useStore((s) => s.employees);
  const online = orders.filter((o) => o.channel === "ONLINE");
  const unassigned = online.filter((o) => ["CONFIRMED", "PACKED"].includes(o.status) && (!o.assignment || o.assignment.status === "FAILED"));
  const assigned = online.filter((o) => ["CONFIRMED", "PACKED"].includes(o.status) && o.assignment && o.assignment.status !== "FAILED");
  const onRoad = online.filter((o) => o.status === "OUT_FOR_DELIVERY");
  const doneToday = online.filter((o) => o.status === "DELIVERED" && isSameDay(o.assignment?.deliveredAt ?? o.placedAt));
  const drivers = employees.filter((e) => e.role === "DELIVERY");

  const columns = [
    { title: "Needs a driver", rows: unassigned },
    { title: "Assigned", rows: assigned },
    { title: "On the road", rows: onRoad },
  ];

  return (
    <div>
      <PageHeader title="Delivery" subtitle="Assign drivers, and watch drops move through the day." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="hero" label="Needs a driver" value={unassigned.length} icon={PackageCheck} />
        <StatCard label="On the road" value={onRoad.length} icon={Truck} />
        <StatCard label="Delivered today" value={doneToday.length} icon={Bike} />
        <StatCard label="Payouts today" value={doneToday.reduce((s, o) => s + (o.assignment?.earning ?? 0), 0)} format={(n) => formatMoney(Math.round(n))} icon={IndianRupee} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((c) => (
          <Panel key={c.title} title={`${c.title} (${c.rows.length})`}>
            {c.rows.length === 0 ? <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">Nothing here</p> : <ul className="space-y-2"><AnimatePresence initial={false}>{c.rows.map((o) => <DropCard key={o.id} order={o} />)}</AnimatePresence></ul>}
          </Panel>
        ))}
      </div>
      <Panel className="mt-5" title="Delivery partners">
        <div className="grid gap-3 md:grid-cols-3">
          {drivers.map((d) => {
            const mine = online.filter((o) => o.assignment?.driverId === d.id);
            const active = mine.filter((o) => ["PACKED", "CONFIRMED", "OUT_FOR_DELIVERY"].includes(o.status)).length;
            const last = mine.filter((o) => o.assignment?.deliveredAt).sort((a, b) => b.assignment!.deliveredAt!.localeCompare(a.assignment!.deliveredAt!))[0];
            return (
              <motion.div key={d.id} whileHover={{ y: -3 }} className="rounded-2xl border p-4">
                <p className="font-semibold">{d.name}{!d.active && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(inactive)</span>}</p>
                <p className="text-xs text-muted-foreground">{d.shift} shift · {active} active drops</p>
                <p className="mt-2 text-xs text-muted-foreground">{mine.filter((o) => o.status === "DELIVERED").length} delivered{last ? `, last ${formatDateTime(last.assignment!.deliveredAt!)}` : ""}</p>
              </motion.div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
