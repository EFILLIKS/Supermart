import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp, SPRING } from "@/components/motion";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Validated with the palette checker: passes colourblind separation and contrast on the card surface. */
export const SERIES = { online: "#047857", pos: "#d97706" };
const GRID = "#ecebe2";
const AXIS = { fontSize: 11, fill: "#5b6b62" };

interface TooltipRow {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({ active, payload, label, unit = "money" }: { active?: boolean; payload?: TooltipRow[]; label?: string | number; unit?: "money" | "count" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}
          <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{unit === "money" ? formatMoney(Number(p.value)) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueArea({ data, height = 280 }: { data: { label: string; revenue: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs><linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SERIES.online} stopOpacity={0.24} /><stop offset="1" stopColor={SERIES.online} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#9aa89f", strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke={SERIES.online} strokeWidth={2} fill="url(#rev-fill)" animationDuration={1100} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ChannelBars({ data, height = 280 }: { data: { label: string; online: number; pos: number }[]; height?: number }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: SERIES.online }} />Online</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: SERIES.pos }} />In store</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -6, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={52} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#047857", fillOpacity: 0.05 }} />
          <Bar dataKey="online" name="Online" stackId="a" fill={SERIES.online} stroke="#fff" strokeWidth={1} animationDuration={900} />
          <Bar dataKey="pos" name="In store" stackId="a" fill={SERIES.pos} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked horizontal bars built in HTML, so that labels stay readable and each bar can grow in. */
export function RankedBars({ rows, format = formatMoney }: { rows: { name: string; value: number; note?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.name} onMouseEnter={() => setHover(r.name)} onMouseLeave={() => setHover(null)} className={cn("transition-opacity", hover && hover !== r.name && "opacity-50")}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{r.name}</span><span className="font-semibold tabular-nums">{format(r.value)}{r.note && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{r.note}</span>}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><motion.div className="h-full origin-left rounded-full bg-emerald-700" initial={{ scaleX: 0 }} whileInView={{ scaleX: r.value / max }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function StatCard({ label, value, format, delta, icon: Icon, hint, tone = "plain" }: { label: string; value: number; format?: (n: number) => string; delta?: number; icon: LucideIcon; hint?: string; tone?: "plain" | "hero" }) {
  const up = (delta ?? 0) >= 0;
  const hero = tone === "hero";
  return (
    <motion.div whileHover={{ y: -4 }} transition={SPRING} className={cn("relative overflow-hidden rounded-3xl border p-5", hero ? "border-transparent bg-[#0b2e23] text-white" : "bg-card")}>
      <div className="flex items-start justify-between"><p className={cn("text-sm font-medium", hero ? "text-emerald-100/80" : "text-muted-foreground")}>{label}</p><span className={cn("grid size-9 place-items-center rounded-xl", hero ? "bg-white/10" : "bg-accent text-primary")}><Icon className="size-[18px]" aria-hidden /></span></div>
      <p className="mt-2 font-display text-4xl font-semibold"><CountUp value={value} format={format} /></p>
      {delta != null && (
        <p className={cn("mt-1.5 flex items-center gap-1 text-xs font-semibold", hero ? "text-emerald-200" : up ? "text-emerald-700" : "text-rose-700")}>
          {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}{Math.abs(delta).toFixed(1)}% {up ? "up" : "down"} on the previous period
        </p>
      )}
      {hint && <p className={cn("mt-1.5 text-xs", hero ? "text-emerald-100/70" : "text-muted-foreground")}>{hint}</p>}
    </motion.div>
  );
}

/** Lets anyone read the numbers behind a chart. */
export function ChartOrTable({ chart, table }: { chart: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      <div className="mb-2 flex justify-end"><button type="button" onClick={() => setAsTable(!asTable)} className="text-xs font-semibold text-primary hover:underline">{asTable ? "View as chart" : "View as table"}</button></div>
      {asTable ? <div className="max-h-80 overflow-auto">{table}</div> : chart}
    </div>
  );
}
