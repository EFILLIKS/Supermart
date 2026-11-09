import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, IndianRupee, ReceiptText, ShoppingBag, Sparkles, Users } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RevenueArea, StatCard } from "@/components/charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { PageHeader, Panel, ProductImage, SimulatedAiBadge, StatusBadge } from "@/components/shared";
import { salesInsights } from "@/lib/ai";
import { dailySeries, periodStats } from "@/lib/analytics";
import { formatCompact, formatDateTime, formatMoney, STATUS_LABEL } from "@/lib/format";
import { useStore } from "@/store";
import type { OrderStatus } from "@/types";

const PIPE: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"];

export default function Overview() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const session = useStore((s) => s.session);
  const stats = useMemo(() => periodStats(orders, 30), [orders]);
  const series = useMemo(() => dailySeries(orders, 30), [orders]);
  const insights = useMemo(() => salesInsights(products, orders).slice(0, 2), [products, orders]);
  const low = products.filter((p) => p.active && p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock).slice(0, 5);
  const counts = PIPE.map((s) => ({ s, n: orders.filter((o) => o.status === s).length }));

  return (
    <div>
      <PageHeader title={`Good day, ${session?.name.split(" ")[0]}`} subtitle="Here is the store over the last 30 days, against the 30 before." actions={<Button asChild className="rounded-full"><Link to="/admin/orders">Open order queue<ArrowRight className="size-4" /></Link></Button>} />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard tone="hero" label="Revenue" value={stats.revenue} format={formatCompact} delta={stats.revenueDelta} icon={IndianRupee} /></StaggerItem>
        <StaggerItem><StatCard label="Orders" value={stats.orders} delta={stats.ordersDelta} icon={ShoppingBag} /></StaggerItem>
        <StaggerItem><StatCard label="Average order" value={stats.aov} format={(n) => formatMoney(Math.round(n))} delta={stats.aovDelta} icon={ReceiptText} /></StaggerItem>
        <StaggerItem><StatCard label="Known customers" value={stats.customers} delta={stats.customersDelta} icon={Users} /></StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Revenue" subtitle="Daily, online and in store combined"><RevenueArea data={series} /></Panel>
        <Panel title="Live pipeline" subtitle="Orders moving through the store right now">
          <ul className="space-y-3">
            {counts.map(({ s, n }, i) => (
              <motion.li key={s} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
                <span className="text-sm font-semibold">{STATUS_LABEL[s]}</span>
                <span className="font-display text-2xl font-semibold tabular-nums">{n}</span>
              </motion.li>
            ))}
          </ul>
          <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/admin/delivery">Manage delivery</Link></Button>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" aria-hidden />Insights</span>} actions={<SimulatedAiBadge />}>
          <p className="mb-3 text-xs text-muted-foreground">Calculated from your orders using fixed rules.</p>
          <ul className="space-y-3">{insights.map((x) => <li key={x.title} className="rounded-2xl bg-accent/50 p-3"><p className="text-sm font-semibold">{x.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{x.detail}</p></li>)}</ul>
          <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/admin/ai">See forecasts</Link></Button>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-700" aria-hidden />Low stock</span>} actions={<Button asChild size="sm" variant="ghost"><Link to="/admin/inventory">Restock</Link></Button>}>
          {low.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Everything is above its reorder level.</p> : (
            <ul className="space-y-2">{low.map((p) => <li key={p.id} className="flex items-center gap-3"><ProductImage src={p.image} alt="" className="size-10 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span><span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">{p.stock} left</span></li>)}</ul>
          )}
        </Panel>
        <Panel title="Latest orders" actions={<Button asChild size="sm" variant="ghost"><Link to="/admin/orders">All</Link></Button>}>
          <ul className="space-y-2.5">{orders.slice(0, 5).map((o) => <li key={o.id} className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{o.customerName}</p><p className="text-xs text-muted-foreground">{o.number} · {formatDateTime(o.placedAt)}</p></div><StatusBadge status={o.status} /></li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}
