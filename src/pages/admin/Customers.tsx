import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/shared";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Customer } from "@/types";

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { spend: number; count: number; last?: string }>();
    orders.filter((o) => o.status !== "CANCELLED" && o.customerId).forEach((o) => {
      const cur = map.get(o.customerId!) ?? { spend: 0, count: 0 };
      cur.spend += o.total;
      cur.count += 1;
      if (!cur.last || o.placedAt > cur.last) cur.last = o.placedAt;
      map.set(o.customerId!, cur);
    });
    return map;
  }, [orders]);

  const rows = customers.filter((c) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (stats.get(b.id)?.spend ?? 0) - (stats.get(a.id)?.spend ?? 0));
  const history = open ? orders.filter((o) => o.customerId === open.id).slice(0, 8) : [];

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} on record, highest spend first`} />
      <Panel>
        <div className="relative mb-4"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, or email" aria-label="Search customers" className="pl-9" /></div>
        <DataTable<Customer>
          rows={rows} rowKey={(c) => c.id} empty="No customers match." onRowClick={setOpen}
          columns={[
            { header: "Customer", cell: (c) => <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-accent font-bold text-primary">{c.name.charAt(0)}</span><span><span className="block font-semibold">{c.name}</span><span className="text-xs text-muted-foreground">{c.email || "No email"}</span></span></span> },
            { header: "Phone", cell: (c) => c.phone || "None" },
            { header: "Orders", cell: (c) => <span className="tabular-nums">{stats.get(c.id)?.count ?? 0}</span> },
            { header: "Total spend", cell: (c) => <span className="font-semibold tabular-nums">{formatMoney(stats.get(c.id)?.spend ?? 0)}</span> },
            { header: "Points", cell: (c) => <span className="tabular-nums">{c.loyaltyPoints}</span> },
            { header: "Last order", cell: (c) => { const l = stats.get(c.id)?.last; return l ? formatDate(l) : "Never"; } },
          ]}
        />
      </Panel>
      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.name}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">{open.phone} · {open.email}<br />Joined {formatDate(open.joinedAt)}</p>
              {open.addresses.map((a) => <p key={a.id} className="rounded-xl bg-muted p-3 text-sm"><strong>{a.label}:</strong> {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postalCode}</p>)}
              <h3 className="font-semibold">Recent orders</h3>
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : <ul className="divide-y">{history.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span><span className="block font-semibold">{o.number}</span><span className="text-xs text-muted-foreground">{formatDateTime(o.placedAt)}</span></span><span className="font-semibold tabular-nums">{formatMoney(o.total)}</span><StatusBadge status={o.status} /></li>)}</ul>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
