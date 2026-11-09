import { Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Field, PageHeader, Panel, ProductImage } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Product } from "@/types";

const blank = (categoryId: string): Product => ({
  id: `new-${Date.now()}`, slug: "", categoryId, barcode: "", name: "", brand: "", description: "", unit: "1 pc", price: 0, mrp: 0, taxRate: 0,
  image: "/images/categories/fruits.svg", origin: "", tags: [], active: true, stock: 0, reorderLevel: 10,
});

function ProductDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertProduct);
  const [form, setForm] = useState(product);
  const [tags, setTags] = useState(product.tags.join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isNew = !products.some((p) => p.id === product.id);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (!form.name.trim()) problems.name = "Enter a product name.";
    if (!form.brand.trim()) problems.brand = "Enter a brand.";
    if (form.price <= 0) problems.price = "Price must be above zero.";
    if (form.mrp < form.price) problems.mrp = "MRP cannot be below the price.";
    if (!/^\d{8,14}$/.test(form.barcode)) problems.barcode = "Use 8 to 14 digits.";
    else if (products.some((p) => p.barcode === form.barcode && p.id !== form.id)) problems.barcode = "Another product already has this barcode.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await upsert({ ...form, slug, tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) });
      toast.success(isNew ? "Product added. Add stock from Inventory." : "Product saved");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{isNew ? "Add a product" : `Edit ${product.name}`}</DialogTitle></DialogHeader>
        <form id="product-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="p-name" error={errors.name}><Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Brand" htmlFor="p-brand" error={errors.brand}><Input id="p-brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Category">
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger className="w-full" aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Pack size" htmlFor="p-unit"><Input id="p-unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
          <Field label="Price (₹, incl. GST)" htmlFor="p-price" error={errors.price}><Input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
          <Field label="MRP (₹)" htmlFor="p-mrp" error={errors.mrp}><Input id="p-mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set("mrp", Number(e.target.value))} /></Field>
          <Field label="GST rate">
            <Select value={String(form.taxRate)} onValueChange={(v) => set("taxRate", Number(v))}>
              <SelectTrigger className="w-full" aria-label="GST rate"><SelectValue /></SelectTrigger>
              <SelectContent>{[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Barcode" htmlFor="p-barcode" error={errors.barcode}><Input id="p-barcode" inputMode="numeric" value={form.barcode} onChange={(e) => set("barcode", e.target.value.trim())} /></Field>
          <Field label="Reorder level" htmlFor="p-reorder"><Input id="p-reorder" type="number" min="0" value={form.reorderLevel} onChange={(e) => set("reorderLevel", Number(e.target.value))} /></Field>
          <Field label="Origin" htmlFor="p-origin"><Input id="p-origin" value={form.origin} onChange={(e) => set("origin", e.target.value)} /></Field>
          <Field label="Image path or URL" htmlFor="p-image" hint="Files in public/images, or a full URL to your own photo."><Input id="p-image" value={form.image} onChange={(e) => set("image", e.target.value)} /></Field>
          <Field label="Tags" htmlFor="p-tags" hint="Comma separated. The assistant searches these."><Input id="p-tags" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Description" htmlFor="p-desc"><Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />On sale</label>
        </form>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="product-form" disabled={busy}>{busy ? "Saving" : "Save product"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Products() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const upsert = useStore((s) => s.upsertProduct);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const rows = useMemo(() => products.filter((p) => (cat === "all" || p.categoryId === cat) && `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())), [products, q, cat]);

  return (
    <div>
      <PageHeader title="Products" subtitle={`${products.length} in the catalogue`} actions={<Button className="rounded-full" onClick={() => setEditing(blank(categories[0]?.id ?? ""))}><Plus className="size-4" />Add product</Button>} />
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand, or barcode" aria-label="Search products" className="pl-9" /></div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-48" aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DataTable<Product>
          rows={rows} rowKey={(p) => p.id} empty="No products match that search."
          columns={[
            { header: "Product", cell: (p) => <span className="flex items-center gap-3"><ProductImage src={p.image} alt="" className="size-11 shrink-0" /><span><span className="block font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{p.brand} · {p.unit}</span></span></span> },
            { header: "Category", cell: (p) => categories.find((c) => c.id === p.categoryId)?.name ?? "None" },
            { header: "Price", cell: (p) => <span className="font-semibold tabular-nums">{formatMoney(p.price)}</span> },
            { header: "GST", cell: (p) => `${p.taxRate}%` },
            { header: "Stock", cell: (p) => <span className={p.stock <= p.reorderLevel ? "font-bold text-amber-800" : "tabular-nums"}>{p.stock}</span> },
            { header: "On sale", cell: (p) => <Switch checked={p.active} aria-label={`${p.name} on sale`} onCheckedChange={(v) => upsert({ ...p, active: v }).catch((e: Error) => toast.error(e.message))} /> },
            { header: "", cell: (p) => <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil className="size-4" /></Button> },
          ]}
        />
      </Panel>
      {editing && <ProductDialog product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
