import { motion } from "framer-motion";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Order } from "@/types";

/** A till receipt that feeds out of the printer slot, and prints as a real invoice. */
export function Invoice({ order }: { order: Order }) {
  const settings = useStore((s) => s.settings);
  return (
    <div>
      <div className="overflow-hidden pt-1">
        <motion.div initial={{ y: "-100%" }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div className="print-area rounded-b-2xl border bg-white p-5 font-mono text-[13px] shadow-sm">
            <div className="flex justify-center"><Logo /></div>
            <p className="mt-2 text-center text-xs text-muted-foreground">{settings.storeName}<br />{settings.supportPhone}</p>
            <div className="my-3 border-t border-dashed" />
            <div className="flex justify-between"><span>Invoice</span><strong>{order.number}</strong></div>
            <div className="flex justify-between"><span>Date</span><span>{formatDateTime(order.placedAt)}</span></div>
            <div className="flex justify-between"><span>Customer</span><span className="text-right">{order.customerName}</span></div>
            <div className="my-3 border-t border-dashed" />
            {order.lines.map((l) => (
              <div key={l.productId + l.name} className="mb-1.5">
                <div className="flex justify-between gap-2"><span>{l.name}</span><span>{formatMoney(l.price * l.quantity)}</span></div>
                <div className="text-xs text-muted-foreground">{l.quantity} x {formatMoney(l.price)} · GST {l.taxRate}%</div>
              </div>
            ))}
            <div className="my-3 border-t border-dashed" />
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(order.discount)}</span></div>}
            {order.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>{formatMoney(order.deliveryFee)}</span></div>}
            <div className="flex justify-between text-xs text-muted-foreground"><span>GST included</span><span>{formatMoney(order.tax)}</span></div>
            <div className="mt-2 flex justify-between text-base font-bold"><span>Total</span><span>{formatMoney(order.total)}</span></div>
            <div className="mt-1 flex justify-between text-xs"><span>Paid by {order.payment.method}</span><span>{order.payment.status}</span></div>
            <p className="mt-4 text-center text-xs text-muted-foreground">Thank you for shopping with us</p>
          </div>
        </motion.div>
      </div>
      <Button variant="outline" className="mt-3 w-full print:hidden" onClick={() => window.print()}><Printer className="size-4" />Print or save as PDF</Button>
    </div>
  );
}
