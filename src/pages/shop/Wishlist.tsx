import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, ProductCard } from "@/components/shared";
import { useStore } from "@/store";

export default function Wishlist() {
  const products = useStore((s) => s.products);
  const wishlist = useStore((s) => s.wishlist);
  const items = products.filter((p) => wishlist.includes(p.id) && p.active);
  return (
    <div>
      <PageHeader title="Wishlist" subtitle={items.length ? `${items.length} saved ${items.length === 1 ? "item" : "items"}` : undefined} />
      {items.length === 0 ? (
        <EmptyState image="/images/products/strawberries.svg" title="Nothing saved yet" body="Tap the heart on any product to keep it here." action={<Button asChild className="rounded-full"><Link to="/shop/products">Browse products</Link></Button>} />
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((p) => <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7, rotate: -4 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}><ProductCard product={p} /></motion.div>)}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
