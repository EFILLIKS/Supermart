import { Banknote, Download, IndianRupee, Percent, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankedBars, StatCard } from "@/components/charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { DataTable, EmptyState, PageHeader, Panel } from "@/components/shared";
import { downloadCsv, formatMoney, formatTime, isSameDay } from "@/lib/format";
import { useStore } from "@/store";
import type { Order } from "@/types";

const toInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Reports() {
  const orders = useStore((s) => s.orders);
  const [date, setDate] = useState(toInput(new Date()));
  const day = useMemo(() => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d); }, [date]);
  const sales = useMemo(() => orders.filter((o) => o.channel === "POS" && o.status !== "CANCELLED" && isSameDay(o.placedAt, day)), [orders, day]);
  const total = sales.reduce((s, o) => s + o.total, 0);
  const tax = sales.reduce((s, o) => s + o.tax, 0);
  const discount = sales.reduce((s, o) => s + o.discount, 0);
  const cash = sales.filter((o) => o.payment.method === "CASH").reduce((s, o) => s + o.total, 0);
  const byMethod = ["CASH", "UPI", "ONLINE"].map((m) => ({ name: m === "CASH" ? "Cash" : m === "UPI" ? "UPI" : "Online", value: sales.filter((o) => o.payment.method === m).reduce((s, o) => s + o.total, 0) }));
  const items = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((o) => o.lines.forEach((l) => map.set(l.name, (map.get(l.name) ?? 0) + l.quantity)));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [sales]);

  return (
    <div>
      <PageHeader title="Daily report" subtitle={day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} actions={<>
        <Input type="date" value={date} max={toInput(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Report date" className="w-44" />
        <Button variant="outline" className="rounded-full" disabled={!sales.length} onClick={() => { downloadCsv(`daily-sales-${date}.csv`, [["Invoice", "Time", "Customer", "Method", "Discount", "GST", "Total"], ...sales.map((o) => [o.number, formatTime(o.placedAt), o.customerName, o.payment.method, o.discount, o.tax, o.total])]); toast.success("Report downloaded"); }}><Download className="size-4" />Download</Button>
      </>} />
      <Stagger key={date} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard tone="hero" label="Total sales" value={total} format={(n) => formatMoney(Math.round(n))} hint={`${sales.length} bills`} icon={IndianRupee} /></StaggerItem>
        <StaggerItem><StatCard label="Cash to reconcile" value={cash} format={(n) => formatMoney(Math.round(n))} icon={Banknote} /></StaggerItem>
        <StaggerItem><StatCard label="GST collected" value={tax} format={(n) => formatMoney(Math.round(n))} icon={ReceiptText} /></StaggerItem>
        <StaggerItem><StatCard label="Discounts given" value={discount} format={(n) => formatMoney(Math.round(n))} icon={Percent} /></StaggerItem>
      </Stagger>
      {sales.length === 0 ? <div className="mt-5"><EmptyState icon={ReceiptText} title="No sales on this day" body="Choose another date, or ring up a sale at the counter." /></div> : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <Panel title="Bills">
            <DataTable<Order> rows={sales} rowKey={(o) => o.id} columns={[
              { header: "Invoice", cell: (o) => <strong>{o.number}</strong> },
              { header: "Time", cell: (o) => formatTime(o.placedAt) },
              { header: "Customer", cell: (o) => o.customerName },
              { header: "Method", cell: (o) => o.payment.method },
              { header: "Total", cell: (o) => <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span> },
            ]} />
          </Panel>
          <div className="space-y-5">
            <Panel title="By payment method"><RankedBars rows={byMethod} /></Panel>
            <Panel title="Top items"><RankedBars rows={items} format={(n) => `${n} sold`} /></Panel>
          </div>
        </div>
      )}
    </div>
  );
}
