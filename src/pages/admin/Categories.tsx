import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Field, PageHeader } from "@/components/shared";
import { useStore } from "@/store";
import type { Category } from "@/types";

export default function Categories() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertCategory);
  const remove = useStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) { setError("Enter a name."); return; }
    try {
      await upsert({ ...editing, slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") });
      toast.success("Category saved");
      setEditing(null);
      setError(undefined);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Categories" subtitle="The aisles customers browse." actions={<Button className="rounded-full" onClick={() => setEditing({ id: `new-${Date.now()}`, slug: "", name: "", description: "", image: "/images/categories/fruits.svg", active: true })}><Plus className="size-4" />Add category</Button>} />
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <StaggerItem key={c.id}>
              <Tilt max={6}>
                <div className="rounded-3xl border bg-card p-5">
                  <motion.img whileHover={{ scale: 1.08, rotate: -3 }} src={c.image} alt="" className="mx-auto size-28" />
                  <h2 className="mt-3 text-xl font-semibold">{c.name}</h2>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
                  <p className="mt-1 text-xs font-semibold">{count} {count === 1 ? "product" : "products"}{c.active ? "" : " · Hidden"}</p>
                  <div className="mt-3 flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="size-3.5" />Edit</Button>
                    <Button size="icon" variant="ghost" className="size-8 text-rose-700 hover:bg-rose-50" aria-label={`Delete ${c.name}`} onClick={() => remove(c.id).then(() => toast.success("Category deleted")).catch((e: Error) => toast.error(e.message))}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </Tilt>
            </StaggerItem>
          );
        })}
      </Stagger>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing && categories.some((c) => c.id === editing.id) ? "Edit category" : "Add a category"}</DialogTitle></DialogHeader>
          {editing && (
            <form id="cat-form" onSubmit={save} className="space-y-3">
              <Field label="Name" htmlFor="c-name" error={error}><Input id="c-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Description" htmlFor="c-desc"><Input id="c-desc" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Image path or URL" htmlFor="c-image"><Input id="c-image" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />Visible in the shop</label>
            </form>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="cat-form">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
