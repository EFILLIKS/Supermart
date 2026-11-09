import { motion } from "framer-motion";
import { ChevronRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, ProductImage, StatusBadge } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";

export default function Orders() {
  const orders = useStore((s) => s.orders);
  const customerId = useStore((s) => s.session?.customerId);
  const mine = orders.filter((o) => o.customerId === customerId);
  return (
    <div>
      <PageHeader title="Your orders" subtitle={mine.length ? `${mine.length} in total` : undefined} />
      {mine.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" body="When you place an order, you can follow it here." action={<Button asChild className="rounded-full"><Link to="/shop/products">Start shopping</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {mine.map((o, i) => (
            <motion.li key={o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }} whileHover={{ x: 4 }}>
              <Link to={`/shop/orders/${o.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary">
                <div className="flex -space-x-3">
                  {o.lines.slice(0, 3).map((l) => <ProductImage key={l.name} src={l.image} alt="" className="size-12 rounded-full border-2 border-card bg-muted p-1" />)}
                </div>
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{o.number}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.placedAt)} · {o.lines.length} {o.lines.length === 1 ? "item" : "items"}{o.channel === "POS" ? " · In store" : ""}</p>
                </div>
                <StatusBadge status={o.status} />
                <p className="w-20 text-right font-bold tabular-nums">{formatMoney(o.total)}</p>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
