import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Ban, Check, CheckCircle2, CircleDashed, Clock3, FlaskConical, Heart, ImageOff, Minus, PackageCheck, Plus, Sparkles, Star, Truck, type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { flyToCart, SPRING } from "@/components/motion";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { OrderStatus, PaymentStatus, Product } from "@/types";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="12" fill={light ? "#ffffff" : "#047857"} />
        <path d="M10 22c0-7 5-12 13-12 2 0 4 .4 7 1.5-.5 9-5 18.5-14 18.5-3.5 0-6-3-6-8Z" fill={light ? "#047857" : "#ecfdf5"} />
        <path d="M13 29C16 22 20 18 26 14" stroke={light ? "#ffffff" : "#047857"} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <span className={cn("font-display text-xl leading-none font-semibold tracking-tight", light ? "text-white" : "text-[#0f3d2e]")}>
        Supermart<span className={light ? "text-emerald-300" : "text-emerald-600"}> AI</span>
      </span>
    </span>
  );
}

/** Reserves its space, shows a shimmer while loading, and has a real fallback if the file is missing. */
export function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <div className={cn("relative", className)}>
      {state === "loading" && <div className="skeleton absolute inset-[12%] rounded-2xl" />}
      {state === "error" ? (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground"><ImageOff className="size-6" aria-hidden />No image</div>
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setState("ready")} onError={() => setState("error")} className={cn("size-full object-contain transition-opacity duration-500", state === "ready" ? "opacity-100" : "opacity-0")} />
      )}
    </div>
  );
}

export function QuantityStepper({ value, onChange, max, size = "md", label }: { value: number; onChange: (n: number) => void; max: number; size?: "sm" | "md"; label: string }) {
  const box = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center rounded-full bg-secondary p-0.5" role="group" aria-label={`Quantity of ${label}`}>
      <motion.button whileTap={{ scale: 0.82 }} type="button" className={cn(box, "grid place-items-center rounded-full text-secondary-foreground hover:bg-white")} onClick={() => onChange(value - 1)} aria-label={`Remove one ${label}`}><Minus className="size-4" /></motion.button>
      <span className="relative w-7 overflow-hidden text-center text-sm font-bold tabular-nums" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} className="inline-block" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.18 }}>{value}</motion.span>
        </AnimatePresence>
      </span>
      <motion.button whileTap={{ scale: 0.82 }} type="button" disabled={value >= max} className={cn(box, "grid place-items-center rounded-full text-secondary-foreground hover:bg-white disabled:opacity-40")} onClick={() => onChange(value + 1)} aria-label={`Add one ${label}`}><Plus className="size-4" /></motion.button>
    </div>
  );
}

export function WishlistButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const on = useStore((s) => s.wishlist.includes(productId));
  const toggle = useStore((s) => s.toggleWishlist);
  return (
    <motion.button
      type="button" whileTap={{ scale: 0.8 }} aria-pressed={on} aria-label={on ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn("relative grid size-10 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white", className)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId).catch((err: Error) => toast.error(err.message)); }}
    >
      <motion.span key={String(on)} initial={{ scale: on ? 0.3 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
        <Heart className={cn("size-[18px]", on ? "fill-rose-500 text-rose-500" : "text-foreground/70")} aria-hidden />
      </motion.span>
      <AnimatePresence>
        {on && <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-rose-400" initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 1.55, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
      </AnimatePresence>
    </motion.button>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", className)} aria-label={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />{value.toFixed(1)}
      {count != null && <span className="font-normal text-muted-foreground">({count})</span>}
    </span>
  );
}

export function useProductRating(productId: string) {
  const reviews = useStore((s) => s.reviews);
  const mine = reviews.filter((r) => r.productId === productId);
  return { count: mine.length, value: mine.length ? mine.reduce((a, r) => a + r.rating, 0) / mine.length : 0 };
}

const TINTS: Record<string, string> = {
  "cat-fruits": "from-orange-50 to-amber-100/70", "cat-vegetables": "from-lime-50 to-emerald-100/70", "cat-dairy": "from-sky-50 to-blue-100/60", "cat-bakery": "from-amber-50 to-orange-100/60",
  "cat-staples": "from-yellow-50 to-amber-100/60", "cat-snacks": "from-rose-50 to-orange-100/60", "cat-beverages": "from-cyan-50 to-teal-100/60", "cat-household": "from-violet-50 to-indigo-100/50",
};
export const tintFor = (categoryId: string) => TINTS[categoryId] ?? "from-emerald-50 to-emerald-100/60";

/** Set sharedImage only where a product appears once per page: its image then morphs into the detail page. */
export function ProductCard({ product, className, sharedImage = false }: { product: Product; className?: string; sharedImage?: boolean }) {
  const qty = useStore((s) => s.cart[product.id] ?? 0);
  const add = useStore((s) => s.addToCart);
  const setQty = useStore((s) => s.setCartQty);
  const rating = useProductRating(product.id);
  const imageRef = useRef<HTMLDivElement>(null);
  const off = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const out = product.stock <= 0;
  return (
    <motion.article layout whileHover={{ y: -6 }} transition={SPRING} className={cn("group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-shadow duration-300 hover:shadow-[0_22px_50px_-22px_rgba(6,78,59,.38)]", className)}>
      <div className={cn("relative bg-gradient-to-br p-5", tintFor(product.categoryId))}>
        <Link to={`/shop/products/${product.slug}`} aria-label={product.name} className="block rounded-2xl">
          <motion.div layoutId={sharedImage ? `product-image-${product.id}` : undefined} ref={imageRef} className="aspect-square transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3">
            <ProductImage src={product.image} alt="" className="size-full" />
          </motion.div>
        </Link>
        {off > 0 && <span className="absolute top-3 left-3 rounded-full bg-[#0f3d2e] px-2.5 py-1 text-[11px] font-bold text-white">{off}% off</span>}
        <WishlistButton productId={product.id} name={product.name} className="absolute top-2 right-2" />
        {product.stock > 0 && product.stock <= product.reorderLevel && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Only {product.stock} left</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{product.brand}</span>{rating.count > 0 && <Rating value={rating.value} className="text-foreground" />}</div>
        <Link to={`/shop/products/${product.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-primary">{product.name}</Link>
        <p className="text-xs text-muted-foreground">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="leading-tight"><p className="font-bold">{formatMoney(product.price)}</p>{off > 0 && <p className="text-xs text-muted-foreground line-through">{formatMoney(product.mrp)}</p>}</div>
          <AnimatePresence mode="wait" initial={false}>
            {out ? <span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">Sold out</span>
              : qty === 0 ? (
                <motion.div key="add" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.16 }}>
                  <Button size="sm" className="rounded-full px-4" onClick={() => { add(product.id); flyToCart(imageRef.current, product.image); }} aria-label={`Add ${product.name} to basket`}><Plus className="size-4" />Add</Button>
                </motion.div>
              ) : (
                <motion.div key="qty" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.16 }}>
                  <QuantityStepper size="sm" value={qty} max={product.stock} label={product.name} onChange={(n) => setQty(product.id, n)} />
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

const STATUS_STYLE: Record<OrderStatus, { icon: LucideIcon; cls: string }> = {
  PLACED: { icon: Clock3, cls: "bg-sky-50 text-sky-800 ring-sky-200" },
  CONFIRMED: { icon: CircleDashed, cls: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  PACKED: { icon: PackageCheck, cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  OUT_FOR_DELIVERY: { icon: Truck, cls: "bg-orange-50 text-orange-800 ring-orange-200" },
  DELIVERED: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  COMPLETED: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  CANCELLED: { icon: Ban, cls: "bg-rose-50 text-rose-800 ring-rose-200" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { icon: Icon, cls } = STATUS_STYLE[status];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", cls)}><Icon className="size-3.5" aria-hidden />{STATUS_LABEL[status]}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, string> = { PAID: "bg-emerald-50 text-emerald-800", PENDING: "bg-amber-50 text-amber-800", FAILED: "bg-rose-50 text-rose-800", REFUNDED: "bg-slate-100 text-slate-700" };
  const label: Record<PaymentStatus, string> = { PAID: "Paid", PENDING: "Pending", FAILED: "Failed", REFUNDED: "Refunded" };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", map[status])}>{label[status]}</span>;
}

export function EmptyState({ image, icon: Icon, title, body, action }: { image?: string; icon?: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
      {image && <motion.img src={image} alt="" className="mb-4 size-32 object-contain" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />}
      {Icon && !image && <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-primary"><Icon className="size-6" aria-hidden /></span>}
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ title = "Something went wrong", body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-rose-200 bg-rose-50/60 px-6 py-12 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-700"><AlertTriangle className="size-6" aria-hidden /></span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading" role="status">
      {Array.from({ length: count }, (_, i) => <div key={i} className="overflow-hidden rounded-3xl border bg-card"><div className="skeleton aspect-[5/5]" /><div className="space-y-2 p-4"><div className="skeleton h-3 w-1/2 rounded" /><div className="skeleton h-4 w-4/5 rounded" /><div className="skeleton h-8 w-full rounded-full" /></div></div>)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 p-6" role="status" aria-label="Loading page">
      <div className="skeleton h-9 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}

/** States plainly that a response comes from local rules. Never implies a live model. */
export function SimulatedAiBadge({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900", className)}><FlaskConical className="size-3" aria-hidden />Simulated, no AI provider connected</span>;
}

export function AiHeading({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><Sparkles className="size-5 text-emerald-600" aria-hidden />{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className }: { title?: ReactNode; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-3xl border bg-card p-5", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>{title && <h2 className="text-lg font-semibold">{title}</h2>}{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function SuccessTick() {
  return (
    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="grid size-20 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
      <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.18, type: "spring", stiffness: 320, damping: 12 }}><Check className="size-10" strokeWidth={3} aria-hidden /></motion.span>
    </motion.span>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** A plain accessible table with scroll on small screens, an empty row, and animated rows. */
export function DataTable<T>({ rows, columns, rowKey, empty = "Nothing to show yet.", onRowClick }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; empty?: string; onRowClick?: (row: T) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">{columns.map((c) => <th key={c.header} scope="col" className={cn("px-3 py-2.5 font-semibold", c.className)}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">{empty}</td></tr>}
          {rows.map((row, i) => (
            <motion.tr key={rowKey(row)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 14) * 0.022, duration: 0.3 }} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn("border-b border-border/60 last:border-0", onRowClick && "cursor-pointer hover:bg-accent/40")}>
              {columns.map((c) => <td key={c.header} className={cn("px-3 py-3 align-middle", c.className)}>{c.cell(row)}</td>)}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
