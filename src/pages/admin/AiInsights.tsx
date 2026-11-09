import { motion } from "framer-motion";
import { Info, Lightbulb, PackagePlus, TrendingUp, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion";
import { DataTable, PageHeader, Panel, ProductImage, SimulatedAiBadge } from "@/components/shared";
import { forecastStock, salesInsights, type StockForecast } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const TONE = { good: { icon: TrendingUp, cls: "bg-emerald-50 text-emerald-800" }, warning: { icon: TriangleAlert, cls: "bg-amber-50 text-amber-800" }, info: { icon: Lightbulb, cls: "bg-sky-50 text-sky-800" } };

function CoverBar({ days }: { days: number }) {
  const finite = Number.isFinite(days);
  const pct = finite ? Math.min(days / 30, 1) : 1;
  const cls = !finite || days > 14 ? "bg-emerald-600" : days > 5 ? "bg-amber-500" : "bg-rose-600";
  const label = !finite ? "No recent sales" : days > 5 ? `${Math.round(days)} days` : `${days.toFixed(1)} days, urgent`;
  return (
    <div className="w-44">
      <p className="mb-1 text-xs font-semibold">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className={cn("h-full origin-left rounded-full", cls)} initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div>
    </div>
  );
}

export default function AiInsights() {
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const adjust = useStore((s) => s.adjustStock);
  const insights = useMemo(() => salesInsights(products, orders), [products, orders]);
  const forecast = useMemo(() => forecastStock(products, orders), [products, orders]);

  return (
    <div>
      <PageHeader title="Forecasts and insights" actions={<SimulatedAiBadge />} />
      <p className="mb-5 flex items-start gap-2 rounded-2xl border bg-card p-3 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />These figures are real calculations on this store's orders: a 28-day moving average and fixed rules. No AI model is connected, so they will not account for seasons, festivals, or promotions.</p>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((x) => {
          const t = TONE[x.tone];
          return (
            <StaggerItem key={x.title}>
              <motion.div whileHover={{ y: -4 }} className="h-full rounded-3xl border bg-card p-5">
                <span className={cn("grid size-10 place-items-center rounded-xl", t.cls)}><t.icon className="size-5" aria-hidden /></span>
                <h2 className="mt-3 text-lg leading-snug font-semibold">{x.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{x.detail}</p>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
      <Panel className="mt-5" title="Inventory forecast" subtitle="Soonest stock-outs first. Suggested order covers 14 days at the current sales rate.">
        <DataTable<StockForecast>
          rows={forecast.slice(0, 20)}
          rowKey={(r) => r.product.id}
          columns={[
            { header: "Product", cell: (r) => <span className="flex items-center gap-3"><ProductImage src={r.product.image} alt="" className="size-10 shrink-0" /><span className="font-semibold">{r.product.name}</span></span> },
            { header: "In stock", cell: (r) => <span className="tabular-nums">{r.product.stock}</span> },
            { header: "Sold per day", cell: (r) => <span className="tabular-nums">{r.dailyRate.toFixed(1)}</span> },
            { header: "Stock lasts", cell: (r) => <CoverBar days={r.daysLeft} /> },
            { header: "Suggested order", cell: (r) => <span className="font-semibold tabular-nums">{r.suggestedReorder || "None"}</span> },
            { header: "", cell: (r) => r.suggestedReorder > 0 && <Button size="sm" variant="outline" className="rounded-full" onClick={() => adjust(r.product.id, r.suggestedReorder, "RESTOCK", "Restocked from the forecast").then(() => toast.success(`Added ${r.suggestedReorder} units of ${r.product.name}`)).catch((e: Error) => toast.error(e.message))}><PackagePlus className="size-4" />Restock</Button> },
          ]}
        />
      </Panel>
    </div>
  );
}
