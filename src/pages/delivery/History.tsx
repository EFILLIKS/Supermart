import { CalendarDays, IndianRupee, PackageCheck, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/charts";
import { DataTable, PageHeader, Panel } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Order } from "@/types";

const DAY = 86400000;

export default function History() {
  const orders = useStore((s) => s.orders);
  const me = useStore((s) => s.session?.userId);
  const [showAll, setShowAll] = useState(false);
  const done = useMemo(() => orders.filter((o) => o.assignment?.driverId === me && o.assignment?.status === "DELIVERED").sort((a, b) => (b.assignment!.deliveredAt ?? "").localeCompare(a.assignment!.deliveredAt ?? "")), [orders, me]);
  const within = (days: number) => done.filter((o) => Date.now() - new Date(o.assignment!.deliveredAt ?? 0).getTime() < days * DAY);
  const sum = (l: Order[]) => l.reduce((s, o) => s + o.assignment!.earning, 0);
  const week = within(7);
  const month = within(30);
  const series = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * DAY);
    const earned = done.filter((o) => new Date(o.assignment!.deliveredAt ?? 0).toDateString() === d.toDateString()).reduce((s, o) => s + o.assignment!.earning, 0);
    return { label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), earned };
  }), [done]);

  return (
    <div>
      <PageHeader title="History and earnings" subtitle={`${done.length} deliveries completed`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="hero" label="This week" value={sum(week)} format={(n) => formatMoney(Math.round(n))} icon={IndianRupee} hint={`${week.length} drops`} />
        <StatCard label="Last 30 days" value={sum(month)} format={(n) => formatMoney(Math.round(n))} icon={CalendarDays} hint={`${month.length} drops`} />
        <StatCard label="All time" value={sum(done)} format={(n) => formatMoney(Math.round(n))} icon={TrendingUp} />
        <StatCard label="Average per drop" value={done.length ? sum(done) / done.length : 0} format={(n) => formatMoney(Math.round(n))} icon={PackageCheck} />
      </div>
      <Panel className="mt-5" title="Daily earnings" subtitle="Last 14 days">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#ecebe2" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b6b62" }} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: "#5b6b62" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#047857", fillOpacity: 0.05 }} formatter={(v) => [formatMoney(Number(v)), "Earned"]} contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e6e5dc" }} />
            <Bar dataKey="earned" fill="#047857" radius={[4, 4, 0, 0]} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel className="mt-5" title="Past deliveries" actions={done.length > 15 && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${done.length}`}</button>}>
        <DataTable<Order>
          rows={showAll ? done : done.slice(0, 15)} rowKey={(o) => o.id} empty="Your completed deliveries will appear here."
          columns={[
            { header: "Order", cell: (o) => <strong>{o.number}</strong> },
            { header: "Delivered", cell: (o) => formatDateTime(o.assignment!.deliveredAt ?? o.placedAt) },
            { header: "Customer", cell: (o) => o.customerName },
            { header: "Area", cell: (o) => o.address?.line2 ?? o.address?.city ?? "" },
            { header: "Earned", cell: (o) => <span className="font-semibold tabular-nums">{formatMoney(o.assignment!.earning)}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
