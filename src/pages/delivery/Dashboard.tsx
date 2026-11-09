import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, IndianRupee, MapPin, Package, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/charts";
import { MapView } from "@/components/MapView";
import { Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/shared";
import { formatMoney, isSameDay } from "@/lib/format";
import { useStore } from "@/store";

export default function Dashboard() {
  const orders = useStore((s) => s.orders);
  const session = useStore((s) => s.session);
  const mine = orders.filter((o) => o.assignment?.driverId === session?.userId);
  const onRoad = mine.filter((o) => o.assignment?.status === "PICKED_UP");
  const queued = mine.filter((o) => o.assignment?.status === "ASSIGNED");
  const doneToday = mine.filter((o) => o.assignment?.status === "DELIVERED" && isSameDay(o.assignment.deliveredAt ?? ""));
  const earnedToday = doneToday.reduce((s, o) => s + (o.assignment?.earning ?? 0), 0);
  const next = onRoad[0] ?? queued[0];

  return (
    <div>
      <PageHeader title={`Hello, ${session?.name.split(" ")[0]}`} subtitle={`${onRoad.length + queued.length} drops left today`} />
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard tone="hero" label="Earned today" value={earnedToday} format={(n) => formatMoney(Math.round(n))} icon={IndianRupee} /></StaggerItem>
        <StaggerItem><StatCard label="On the road" value={onRoad.length} icon={Truck} /></StaggerItem>
        <StaggerItem><StatCard label="Waiting to collect" value={queued.length} icon={Package} /></StaggerItem>
        <StaggerItem><StatCard label="Delivered today" value={doneToday.length} icon={CheckCircle2} /></StaggerItem>
      </Stagger>

      <div className="mt-5">
        {next ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <MapView progress={next.assignment?.status === "PICKED_UP" ? 0.55 : 0.04} label={`Schematic route to ${next.customerName}`} className="h-80 lg:h-full lg:min-h-96" />
            <Panel title="Next drop">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-2"><p className="text-lg font-semibold">{next.number}</p><StatusBadge status={next.status} /></div>
                <p className="mt-3 font-medium">{next.customerName}</p>
                <p className="mt-1 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{next.address?.line1}{next.address?.line2 ? `, ${next.address.line2}` : ""}, {next.address?.city} {next.address?.postalCode}</p>
                <p className="mt-2 text-sm">Slot: <strong>{next.slot}</strong></p>
                <p className="text-sm">{next.lines.reduce((s, l) => s + l.quantity, 0)} items{next.payment.method === "COD" ? ` · Collect ${formatMoney(next.total)} in cash` : " · Already paid"}</p>
                <Button asChild size="lg" className="group mt-5 w-full rounded-full"><Link to={`/delivery/orders/${next.id}`}>Open this drop<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></Button>
              </motion.div>
            </Panel>
          </div>
        ) : <EmptyState image="/images/scenes/delivery-van.svg" title="No drops right now" body="New assignments from the store will appear here." />}
      </div>
    </div>
  );
}
