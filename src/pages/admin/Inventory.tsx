import { ArrowDownLeft, ArrowUpRight, PackagePlus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Field, PageHeader, Panel, ProductImage } from "@/components/shared";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { MovementReason, Product, StockMovement } from "@/types";

const REASONS: { value: MovementReason; label: string; sign: 1 | -1 }[] = [
  { value: "RESTOCK", label: "Supplier delivery (adds stock)", sign: 1 },
  { value: "RETURN", label: "Customer return (adds stock)", sign: 1 },
  { value: "DAMAGE", label: "Damaged or expired (removes stock)", sign: -1 },
  { value: "ADJUSTMENT", label: "Stock count correction (removes stock)", sign: -1 },
];

function AdjustDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const adjust = useStore((s) => s.adjustStock);
  const [reason, setReason] = useState<MovementReason>("RESTOCK");
  const [qty, setQty] = useState(10);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const sign = REASONS.find((r) => r.value === reason)!.sign;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(qty) || qty <= 0) { setError("Enter a whole number above zero."); return; }
    try {
      await adjust(product.id, sign * qty, reason, note.trim() || undefined);
      toast.success(`${product.name} is now at ${product.stock + sign * qty}`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adjust {product.name}</DialogTitle></DialogHeader>
        <form id="adjust" onSubmit={save} className="space-y-3">
          <p className="text-sm text-muted-foreground">Currently {product.stock} in stock. Each change is recorded.</p>
          <Field label="Reason">
            <Select value={reason} onValueChange={(v) => setReason(v as MovementReason)}>
              <SelectTrigger className="w-full" aria-label="Reason"><SelectValue /></SelectTrigger>
              <SelectContent>{REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Quantity" htmlFor="adj-qty" error={error}><Input id="adj-qty" type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <Field label="Note (optional)" htmlFor="adj-note"><Input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </form>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="adjust">Record change</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventory() {
  const products = useStore((s) => s.products);
  const movements = useStore((s) => s.movements);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const rows = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) && (!onlyLow || p.stock <= p.reorderLevel)).sort((a, b) => a.stock - a.reorderLevel - (b.stock - b.reorderLevel)), [products, q, onlyLow]);
  const nameOf = (id: string) => products.find((p) => p.id === id);
  const value = products.reduce((s, p) => s + p.stock * p.price, 0);
  const low = products.filter((p) => p.active && p.stock <= p.reorderLevel).length;

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${formatMoney(value)} of stock at sale price · ${low} products at or below reorder level`} />
      <Tabs defaultValue="stock">
        <TabsList><TabsTrigger value="stock">Stock levels</TabsTrigger><TabsTrigger value="movements">Stock movements</TabsTrigger></TabsList>
        <TabsContent value="stock">
          <Panel>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative min-w-56 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search inventory" className="pl-9" /></div>
              <Button variant={onlyLow ? "default" : "outline"} onClick={() => setOnlyLow(!onlyLow)} aria-pressed={onlyLow}>Low stock only</Button>
            </div>
            <DataTable<Product>
              rows={rows} rowKey={(p) => p.id} empty="No products match."
              columns={[
                { header: "Product", cell: (p) => <span className="flex items-center gap-3"><ProductImage src={p.image} alt="" className="size-10 shrink-0" /><span className="font-semibold">{p.name}</span></span> },
                { header: "In stock", cell: (p) => <span className="font-semibold tabular-nums">{p.stock}</span> },
                { header: "Reorder at", cell: (p) => <span className="tabular-nums">{p.reorderLevel}</span> },
                { header: "Status", cell: (p) => p.stock === 0 ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800">Sold out</span> : p.stock <= p.reorderLevel ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Low</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Healthy</span> },
                { header: "", cell: (p) => <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(p)} aria-label={`Adjust stock of ${p.name}`}><PackagePlus className="size-4" />Adjust</Button> },
              ]}
            />
          </Panel>
        </TabsContent>
        <TabsContent value="movements">
          <Panel>
            <DataTable<StockMovement>
              rows={movements.slice(0, 80)} rowKey={(m) => m.id} empty="No stock has moved yet."
              columns={[
                { header: "When", cell: (m) => formatDateTime(m.at) },
                { header: "Product", cell: (m) => <span className="font-semibold">{nameOf(m.productId)?.name ?? "Removed product"}</span> },
                { header: "Change", cell: (m) => <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${m.delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>{m.delta > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownLeft className="size-3.5" aria-hidden />}{m.delta > 0 ? "+" : ""}{m.delta}</span> },
                { header: "Reason", cell: (m) => <span className="capitalize">{m.reason.toLowerCase()}</span> },
                { header: "Note", cell: (m) => <span className="text-muted-foreground">{m.note ?? ""}</span> },
              ]}
            />
          </Panel>
        </TabsContent>
      </Tabs>
      {editing && <AdjustDialog product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
