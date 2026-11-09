import { motion } from "framer-motion";
import { IndianRupee, ReceiptText, ShoppingBag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ChannelBars, ChartOrTable, RankedBars, RevenueArea, StatCard } from "@/components/charts";
import { PageHeader, Panel } from "@/components/shared";
import { categoryRevenue, dailySeries, paymentMix, periodStats, topProducts } from "@/lib/analytics";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const RANGES = [7, 14, 30, 60];

export default function Analytics() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [days, setDays] = useState(30);
  const stats = useMemo(() => periodStats(orders, days), [orders, days]);
  const series = useMemo(() => dailySeries(orders, days), [orders, days]);
  const top = useMemo(() => topProducts(orders, days), [orders, days]);
  const cats = useMemo(() => categoryRevenue(orders, products, categories, days), [orders, products, categories, days]);
  const mix = useMemo(() => paymentMix(orders, days), [orders, days]);

  return (
    <div>
      <PageHeader title="Revenue and sales" subtitle="Change the period to compare it with the one before." actions={
        <div className="flex rounded-full bg-muted p-1" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)} className="relative rounded-full px-4 py-1.5 text-sm font-semibold">
              {days === r && <motion.span layoutId="range" className="absolute inset-0 rounded-full bg-card shadow-sm" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className={cn("relative", days === r ? "text-primary" : "text-muted-foreground")}>{r} days</span>
            </button>
          ))}
        </div>
      } />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="hero" label="Revenue" value={stats.revenue} format={formatCompact} delta={stats.revenueDelta} icon={IndianRupee} />
        <StatCard label="Orders" value={stats.orders} delta={stats.ordersDelta} icon={ShoppingBag} />
        <StatCard label="Average order" value={stats.aov} format={(n) => formatMoney(Math.round(n))} delta={stats.aovDelta} icon={ReceiptText} />
        <StatCard label="Known customers" value={stats.customers} delta={stats.customersDelta} icon={Users} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Revenue over time">
          <ChartOrTable chart={<RevenueArea key={days} data={series} />} table={<SimpleTable headers={["Day", "Revenue", "Orders"]} rows={series.map((d) => [d.label, formatMoney(d.revenue), d.orders])} />} />
        </Panel>
        <Panel title="Online and in-store revenue">
          <ChartOrTable chart={<ChannelBars key={days} data={series} height={256} />} table={<SimpleTable headers={["Day", "Online", "In store"]} rows={series.map((d) => [d.label, formatMoney(d.online), formatMoney(d.pos)])} />} />
        </Panel>
        <Panel title="Top products" subtitle="By revenue"><RankedBars rows={top.map((t) => ({ name: t.name, value: t.revenue, note: `${t.units} sold` }))} /></Panel>
        <div className="space-y-5">
          <Panel title="Revenue by aisle"><RankedBars rows={cats.map((c) => ({ name: c.name, value: c.revenue }))} /></Panel>
          <Panel title="Payment methods"><RankedBars rows={mix.map((m) => ({ name: m.name, value: m.revenue }))} /></Panel>
        </div>
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-card"><tr className="border-b text-xs text-muted-foreground uppercase">{headers.map((h) => <th key={h} scope="col" className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={String(r[0])} className="border-b border-border/60">{r.map((c, i) => <td key={i} className="py-1.5 pr-3 tabular-nums">{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
