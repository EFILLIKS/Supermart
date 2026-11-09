import { AnimatePresence, motion } from "framer-motion";
import { Search, UserRound } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Customer } from "@/types";

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Customer | null>(null);
  const matches = customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const history = picked ? orders.filter((o) => o.customerId === picked.id) : [];
  const spend = history.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <PageHeader title="Customer lookup" subtitle="Find a customer by name or phone." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel>
          <div className="relative mb-3"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" aria-label="Search customers" className="pl-9" /></div>
          {matches.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No customer found. You can add one from the billing counter.</p> : (
            <ul className="max-h-[60dvh] space-y-1 overflow-y-auto">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setPicked(c)} aria-current={picked?.id === c.id} className="relative w-full rounded-xl p-2.5 text-left text-sm">
                    {picked?.id === c.id && <motion.span layoutId="customer-pick" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                    <span className="relative block font-semibold">{c.name}</span>
                    <span className="relative block text-xs text-muted-foreground">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <AnimatePresence mode="wait">
          {picked ? (
            <motion.div key={picked.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
              <Panel title={picked.name} subtitle={`${picked.phone}${picked.email ? ` · ${picked.email}` : ""}`}>
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                  {[["Orders", String(history.length)], ["Spend", formatMoney(spend)], ["Points", String(picked.loyaltyPoints)]].map(([a, b]) => <div key={a} className="rounded-2xl bg-muted/70 p-3"><p className="font-display text-xl font-semibold">{b}</p><p className="text-xs text-muted-foreground">{a}</p></div>)}
                </div>
                {history.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p> : (
                  <ul className="divide-y">{history.slice(0, 10).map((o) => <li key={o.id} className="flex items-center justify-between gap-2 py-2.5 text-sm"><span><span className="block font-semibold">{o.number}</span><span className="text-xs text-muted-foreground">{formatDateTime(o.placedAt)}</span></span><span className="font-semibold tabular-nums">{formatMoney(o.total)}</span><StatusBadge status={o.status} /></li>)}</ul>
                )}
              </Panel>
            </motion.div>
          ) : <EmptyState key="empty" icon={UserRound} title="Choose a customer" body="Their orders and points will show here." />}
        </AnimatePresence>
      </div>
    </div>
  );
}
