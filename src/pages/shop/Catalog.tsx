import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { EmptyState, ProductCard } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const DIETS = ["vegan", "vegetarian", "keto", "healthy", "kids", "budget"];

export default function Catalog() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const category = params.get("category") ?? "all";
  const [sort, setSort] = useState("popular");
  const [maxPrice, setMaxPrice] = useState(600);
  const [tags, setTags] = useState<string[]>([]);
  const [inStock, setInStock] = useState(false);

  const selectedCategory = categories.find((c) => c.slug === category);

  const results = useMemo(() => {
    const list = products.filter((p) => {
      if (!p.active) return false;
      if (selectedCategory && p.categoryId !== selectedCategory.id) return false;
      if (p.price > maxPrice) return false;
      if (inStock && p.stock <= 0) return false;
      if (tags.length && !tags.every((t) => p.tags.includes(t))) return false;
      if (q && !`${p.name} ${p.brand} ${p.tags.join(" ")} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "off") list.sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, selectedCategory, maxPrice, inStock, tags, q, sort]);

  const pickCategory = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug === "all") next.delete("category");
    else next.set("category", slug);
    setParams(next);
  };
  const clearAll = () => { setParams({}); setTags([]); setMaxPrice(600); setInStock(false); };

  const filters = (
    <div className="space-y-6">
      <div>
        <p id="price-label" className="mb-3 flex justify-between text-sm font-semibold">Max price<span className="font-bold text-primary">{formatMoney(maxPrice)}</span></p>
        <Slider aria-labelledby="price-label" min={40} max={600} step={10} value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Diet and needs</legend>
        <div className="space-y-2">
          {DIETS.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-sm capitalize">
              <Checkbox checked={tags.includes(t)} onCheckedChange={(on) => setTags((x) => (on ? [...x, t] : x.filter((y) => y !== t)))} />{t === "kids" ? "Kid friendly" : t}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><Checkbox checked={inStock} onCheckedChange={(on) => setInStock(Boolean(on))} />In stock only</label>
      <Button variant="outline" className="w-full" onClick={clearAll}>Clear all filters</Button>
    </div>
  );

  return (
    <div>
      <h1 className="text-4xl font-medium">{q ? `Results for "${params.get("q")}"` : selectedCategory?.name ?? "All products"}</h1>
      <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{selectedCategory?.description ? `${selectedCategory.description}. ` : ""}{results.length} {results.length === 1 ? "product" : "products"}</p>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Categories">
        {[{ slug: "all", name: "All" }, ...categories.filter((c) => c.active)].map((c) => {
          const active = category === c.slug;
          return (
            <button key={c.slug} type="button" role="tab" aria-selected={active} onClick={() => pickCategory(c.slug)} className="relative shrink-0 rounded-full border bg-card px-4 py-2 text-sm font-semibold whitespace-nowrap">
              {active && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className={cn("relative", active && "text-white")}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-32 rounded-3xl border bg-card p-5">{filters}</div></aside>
        <div>
          <div className="mb-4 flex items-center justify-between gap-2">
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="rounded-full lg:hidden"><SlidersHorizontal className="size-4" />Filters</Button></SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto"><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="px-4 pb-6">{filters}</div></SheetContent>
            </Sheet>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {tags.map((t) => <motion.button key={t} type="button" layout initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} onClick={() => setTags((x) => x.filter((y) => y !== t))} className="hidden items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold capitalize text-primary sm:inline-flex" aria-label={`Remove filter ${t}`}>{t}<X className="size-3" aria-hidden /></motion.button>)}
              </AnimatePresence>
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="ml-auto w-44 rounded-full" aria-label="Sort products"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Featured</SelectItem>
                <SelectItem value="low">Price, low to high</SelectItem>
                <SelectItem value="high">Price, high to low</SelectItem>
                <SelectItem value="off">Biggest savings</SelectItem>
                <SelectItem value="name">Name, A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {results.length === 0 ? (
            <EmptyState image="/images/products/potato.svg" title="Nothing matches those filters" body="Try a higher price, fewer filters, or a different word." action={<Button className="rounded-full" onClick={clearAll}>Clear filters</Button>} />
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {results.map((p) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
                    <ProductCard product={p} sharedImage />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
