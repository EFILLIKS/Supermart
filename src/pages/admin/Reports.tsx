import { motion } from "framer-motion";
import { Boxes, Download, IndianRupee, Truck, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stagger, StaggerItem } from "@/components/motion";
import { PageHeader } from "@/components/shared";
import { downloadCsv, formatDate } from "@/lib/format";
import { useStore } from "@/store";

export default function Reports() {
  const store = useStore();
  const [days, setDays] = useState("30");
  const since = Date.now() - Number(days) * 86400000;
  const recent = store.orders.filter((o) => new Date(o.placedAt).getTime() >= since);
  const stamp = new Date().toISOString().slice(0, 10);
  const save = (name: string, rows: (string | number)[][]) => {
    downloadCsv(`${name}-${stamp}.csv`, rows);
    toast.success(`Downloaded ${rows.length - 1} rows`);
  };

  const reports: { title: string; body: string; icon: LucideIcon; run: () => void; count: number }[] = [
    {
      title: "Sales", body: "Every order with tax, discount, and payment.", icon: IndianRupee, count: recent.length,
      run: () => save("sales", [["Order", "Date", "Channel", "Customer", "Status", "Subtotal", "Discount", "GST", "Delivery", "Total", "Payment", "Payment status"], ...recent.map((o) => [o.number, formatDate(o.placedAt), o.channel, o.customerName, o.status, o.subtotal, o.discount, o.tax, o.deliveryFee, o.total, o.payment.method, o.payment.status])]),
    },
    {
      title: "Inventory", body: "Stock on hand and value for each product.", icon: Boxes, count: store.products.length,
      run: () => save("inventory", [["Product", "Brand", "Barcode", "Stock", "Reorder level", "Price", "Stock value"], ...store.products.map((p) => [p.name, p.brand, p.barcode, p.stock, p.reorderLevel, p.price, p.stock * p.price])]),
    },
    {
      title: "Customers", body: "Contact details, orders, and total spend.", icon: Users, count: store.customers.length,
      run: () => save("customers", [["Name", "Phone", "Email", "Orders", "Spend", "Points"], ...store.customers.map((c) => { const mine = store.orders.filter((o) => o.customerId === c.id && o.status !== "CANCELLED"); return [c.name, c.phone, c.email, mine.length, mine.reduce((s, o) => s + o.total, 0), c.loyaltyPoints]; })]),
    },
    {
      title: "Delivery", body: "Drops per driver, with times and payouts.", icon: Truck, count: recent.filter((o) => o.assignment).length,
      run: () => save("delivery", [["Order", "Driver", "Status", "Assigned", "Delivered", "Payout"], ...recent.filter((o) => o.assignment).map((o) => [o.number, o.assignment!.driverName, o.assignment!.status, formatDate(o.assignment!.assignedAt), o.assignment!.deliveredAt ? formatDate(o.assignment!.deliveredAt) : "", o.assignment!.earning])]),
    },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Download spreadsheets you can open in Excel or Google Sheets." actions={
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40 rounded-full" aria-label="Period"><SelectValue /></SelectTrigger>
          <SelectContent>{["7", "30", "60"].map((d) => <SelectItem key={d} value={d}>Last {d} days</SelectItem>)}</SelectContent>
        </Select>
      } />
      <Stagger className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <StaggerItem key={r.title}>
            <motion.div whileHover={{ y: -4 }} className="flex h-full flex-col rounded-3xl border bg-card p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary"><r.icon className="size-5" aria-hidden /></span>
              <h2 className="mt-3 text-2xl font-medium">{r.title}</h2>
              <p className="text-sm text-muted-foreground">{r.body}</p>
              <p className="mt-2 text-xs font-semibold">{r.count} rows</p>
              <Button variant="outline" className="mt-4 w-fit rounded-full" onClick={r.run}><Download className="size-4" />Download CSV</Button>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
