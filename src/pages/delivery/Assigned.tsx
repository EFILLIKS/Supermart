import { motion } from "framer-motion";
import { Banknote, ChevronRight, CircleCheck, MapPin, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store";

export default function Assigned() {
  const orders = useStore((s) => s.orders);
  const me = useStore((s) => s.session?.userId);
  const mine = orders
    .filter((o) => o.assignment?.driverId === me && (o.assignment?.status === "ASSIGNED" || o.assignment?.status === "PICKED_UP"))
    .sort((a, b) => (a.assignment!.status === "PICKED_UP" ? -1 : 1) - (b.assignment!.status === "PICKED_UP" ? -1 : 1));
  return (
    <div>
      <PageHeader title="Assigned orders" subtitle="Out for delivery first, then those waiting at the store." />
      {mine.length === 0 ? <EmptyState icon={Package} title="All clear" body="You have no assigned orders." /> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {mine.map((o, i) => (
            <motion.li key={o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
              <Link to={`/delivery/orders/${o.id}`} className="block rounded-3xl border bg-card p-5 transition-colors hover:border-primary">
                <div className="flex items-center justify-between gap-2"><strong>{o.number}</strong><StatusBadge status={o.status} /></div>
                <p className="mt-2 font-semibold">{o.customerName}</p>
                <p className="mt-1 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ""}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">{o.payment.method === "COD" ? <><Banknote className="size-4 text-amber-700" aria-hidden />Collect {formatMoney(o.total)}</> : <><CircleCheck className="size-4 text-primary" aria-hidden />Paid</>}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">{o.slot}<ChevronRight className="size-4" aria-hidden /></span>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
