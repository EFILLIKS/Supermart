import { motion } from "framer-motion";
import { Leaf, MapPin, ShieldCheck, ShoppingBasket, Star, Truck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { flyToCart, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, Field, ProductCard, ProductImage, QuantityStepper, Rating, tintFor, useProductRating, WishlistButton } from "@/components/shared";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export default function ProductDetail() {
  const { slug } = useParams();
  const products = useStore((s) => s.products);
  const allReviews = useStore((s) => s.reviews);
  const categories = useStore((s) => s.categories);
  const session = useStore((s) => s.session);
  const inCart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const addReview = useStore((s) => s.addReview);
  const navigate = useNavigate();
  const product = products.find((p) => p.slug === slug && p.active);
  const [qty, setQty] = useState(1);
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const imageRef = useRef<HTMLDivElement>(null);
  const rating = useProductRating(product?.id ?? "");
  const reviews = useMemo(() => allReviews.filter((r) => r.productId === product?.id), [allReviews, product?.id]);
  const related = useMemo(() => products.filter((p) => p.categoryId === product?.categoryId && p.id !== product?.id && p.active).slice(0, 4), [products, product]);

  if (!product) {
    return <EmptyState image="/images/products/banana-robusta.svg" title="We could not find that product" body="It may have been removed from the store." action={<Button asChild className="rounded-full"><Link to="/shop/products">Browse all products</Link></Button>} />;
  }
  const category = categories.find((c) => c.id === product.categoryId);
  const off = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const remaining = product.stock - (inCart[product.id] ?? 0);

  return (
    <div className="space-y-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link to="/shop/products" className="hover:text-primary">All products</Link> / {category && <Link to={`/shop/products?category=${category.slug}`} className="hover:text-primary">{category.name}</Link>}</nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className={cn("relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-10", tintFor(product.categoryId))}>
          <motion.div layoutId={`product-image-${product.id}`} ref={imageRef} className="mx-auto aspect-square max-w-md" whileHover={{ scale: 1.06, rotate: -2 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
            <ProductImage src={product.image} alt={`${product.name}, ${product.unit}`} className="size-full" />
          </motion.div>
          <WishlistButton productId={product.id} name={product.name} className="absolute top-4 right-4 size-12" />
        </div>
        <Stagger className="flex flex-col" gap={0.07}>
          <StaggerItem><p className="text-sm font-semibold text-primary">{product.brand}</p></StaggerItem>
          <StaggerItem><h1 className="mt-1 text-4xl leading-tight font-medium md:text-5xl">{product.name}</h1></StaggerItem>
          <StaggerItem><div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">{rating.count > 0 && <Rating value={rating.value} count={rating.count} className="text-sm text-foreground" />}<span>{product.unit}</span></div></StaggerItem>
          <StaggerItem>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-4xl font-semibold">{formatMoney(product.price)}</span>
              {off > 0 && <><span className="text-muted-foreground line-through">{formatMoney(product.mrp)}</span><span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary">Save {off}%</span></>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Includes GST at {product.taxRate}%</p>
          </StaggerItem>
          <StaggerItem><p className="mt-5 leading-relaxed text-foreground/80">{product.description}</p></StaggerItem>
          <StaggerItem>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {product.stock > 0 ? (
                <>
                  <QuantityStepper value={qty} max={Math.max(1, remaining)} label={product.name} onChange={(n) => setQty(Math.max(1, n))} />
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="h-12 rounded-full px-7" disabled={remaining <= 0} onClick={() => { addToCart(product.id, qty); flyToCart(imageRef.current, product.image); setQty(1); }}><ShoppingBasket className="size-4" />{remaining <= 0 ? "All stock in basket" : `Add for ${formatMoney(product.price * qty)}`}</Button>
                  </motion.div>
                </>
              ) : <span className="rounded-full bg-muted px-5 py-3 font-semibold text-muted-foreground">Sold out for now</span>}
            </div>
            {product.stock > 0 && product.stock <= product.reorderLevel && <p className="mt-2 text-sm font-semibold text-amber-800">Only {product.stock} left in stock</p>}
          </StaggerItem>
          <StaggerItem>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {[{ icon: MapPin, a: "Origin", b: product.origin }, { icon: Truck, a: "Delivery", b: "Same-day slots" }, { icon: ShieldCheck, a: "Handover", b: "Confirmed by code" }].map((x) => <li key={x.a} className="rounded-2xl border bg-card p-3"><x.icon className="size-4 text-primary" aria-hidden /><p className="mt-1 text-xs text-muted-foreground">{x.a}</p><p className="text-sm font-semibold">{x.b}</p></li>)}
            </ul>
            <div className="mt-4 flex flex-wrap gap-1.5">{product.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize"><Leaf className="size-3 text-primary" aria-hidden />{t}</span>)}</div>
          </StaggerItem>
        </Stagger>
      </div>

      <section aria-labelledby="reviews" className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Reveal><h2 id="reviews" className="mb-4 text-3xl font-medium">Reviews {rating.count > 0 && <span className="text-lg text-muted-foreground">({rating.count})</span>}</h2></Reveal>
          {reviews.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No reviews yet. Be the first.</p> : (
            <ul className="space-y-3">
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.05}>
                  <li className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold">{r.author}</p><time className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</time></div>
                    <div className="my-1 flex gap-0.5" aria-label={`${r.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-border")} aria-hidden />)}</div>
                    <p className="text-sm text-foreground/80">{r.body}</p>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
        <form className="h-fit space-y-4 rounded-3xl border bg-card p-5" onSubmit={async (e) => {
          e.preventDefault();
          if (session?.role !== "CUSTOMER") { navigate(`/login?role=CUSTOMER&next=${encodeURIComponent(`/shop/products/${product.slug}`)}`); return; }
          if (body.trim().length < 5) { setError("Please write at least a few words."); return; }
          setError(undefined);
          try {
            await addReview(product.id, stars, body.trim());
            setBody("");
            toast.success("Thanks, your review is live");
          } catch (err) { toast.error((err as Error).message); }
        }}>
          <h3 className="text-xl font-semibold">Write a review</h3>
          <div role="radiogroup" aria-label="Your rating" className="flex gap-1" onMouseLeave={() => setHoverStars(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} stars`} whileHover={{ scale: 1.25, rotate: -8 }} whileTap={{ scale: 0.85 }} onMouseEnter={() => setHoverStars(n)} onClick={() => setStars(n)}>
                <Star className={cn("size-7 transition-colors", n <= (hoverStars || stars) ? "fill-amber-400 text-amber-400" : "text-border")} aria-hidden />
              </motion.button>
            ))}
          </div>
          <Field label="Your review" htmlFor="review" error={error}><Textarea id="review" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was it?" /></Field>
          <Button type="submit" className="w-full rounded-full">{session?.role === "CUSTOMER" ? "Post review" : "Sign in to review"}</Button>
        </form>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related">
          <Reveal><h2 id="related" className="mb-4 text-3xl font-medium">From the same aisle</h2></Reveal>
          <Stagger onView className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{related.map((p) => <StaggerItem key={p.id}><ProductCard product={p} /></StaggerItem>)}</Stagger>
        </section>
      )}
    </div>
  );
}
