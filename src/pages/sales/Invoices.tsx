import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Invoice } from "@/components/Invoice";
import { DataTable, PageHeader, Panel, PaymentBadge } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Order } from "@/types";

export default function Invoices() {
  const orders = useStore((s) => s.orders);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  const rows = useMemo(() => orders.filter((o) => o.channel === "POS" && `${o.number} ${o.customerName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60), [orders, q]);
  return (
    <div>
      <PageHeader title="Invoices" subtitle="Click any sale to view or reprint its invoice." />
      <Panel>
        <div className="relative mb-4"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice number or customer" aria-label="Search invoices" className="pl-9" /></div>
        <DataTable<Order>
          rows={rows} rowKey={(o) => o.id} empty="No sales match that search." onRowClick={setOpen}
          columns={[
            { header: "Invoice", cell: (o) => <strong>{o.number}</strong> },
            { header: "Date", cell: (o) => formatDateTime(o.placedAt) },
            { header: "Customer", cell: (o) => o.customerName },
            { header: "Items", cell: (o) => o.lines.reduce((s, l) => s + l.quantity, 0) },
            { header: "Payment", cell: (o) => <span className="flex items-center gap-1.5 text-xs">{o.payment.method}<PaymentBadge status={o.payment.status} /></span> },
            { header: "Total", cell: (o) => <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span> },
          ]}
        />
      </Panel>
      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Invoice {open?.number}</DialogTitle></DialogHeader>
          {open && <Invoice order={open} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
