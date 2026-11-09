import { motion } from "framer-motion";
import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, Field, PageHeader } from "@/components/shared";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store";
import type { Coupon } from "@/types";

export default function Coupons() {
  const coupons = useStore((s) => s.coupons);
  const upsert = useStore((s) => s.upsertCoupon);
  const remove = useStore((s) => s.deleteCoupon);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const problems: Record<string, string> = {};
    const code = editing.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) problems.code = "Use 3 to 20 letters and numbers.";
    else if (coupons.some((c) => c.code === code && c.id !== editing.id)) problems.code = "That code already exists.";
    if (editing.value <= 0) problems.value = "Enter a value above zero.";
    if (editing.kind === "PERCENT" && editing.value > 90) problems.value = "A percentage cannot be above 90.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    try {
      await upsert({ ...editing, code });
      toast.success("Coupon saved");
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Coupons and discounts" subtitle="Codes customers can apply at checkout." actions={<Button className="rounded-full" onClick={() => setEditing({ id: `new-${Date.now()}`, code: "", description: "", kind: "PERCENT", value: 10, minOrder: 0, usedCount: 0, active: true })}><Plus className="size-4" />New coupon</Button>} />
      {coupons.length === 0 ? <EmptyState icon={Scissors} title="No coupons yet" body="Create one to run a promotion." /> : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {coupons.map((c) => {
            const used = c.usageLimit ? Math.min(c.usedCount / c.usageLimit, 1) : 0;
            return (
              <StaggerItem key={c.id}>
                <motion.div whileHover={{ y: -4, rotate: -0.4 }} className="flex overflow-hidden rounded-3xl border bg-card">
                  <div className="flex w-32 shrink-0 flex-col items-center justify-center bg-emerald-700 p-3 text-center text-white">
                    <p className="font-display text-3xl font-semibold">{c.kind === "PERCENT" ? `${c.value}%` : formatMoney(c.value)}</p>
                    <p className="text-xs opacity-80">off</p>
                  </div>
                  <div className="min-w-0 flex-1 border-l-2 border-dashed p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-lg font-bold tracking-wider">{c.code}</p>
                      <Switch checked={c.active} aria-label={`${c.code} active`} onCheckedChange={(v) => upsert({ ...c, active: v }).catch((e: Error) => toast.error(e.message))} />
                    </div>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.minOrder ? `Minimum ${formatMoney(c.minOrder)}` : "No minimum"}{c.maxDiscount ? ` · up to ${formatMoney(c.maxDiscount)}` : ""}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                      <span>{c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ""} used</span>
                      {c.usageLimit && <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><motion.span className="block h-full origin-left rounded-full bg-emerald-600" initial={{ scaleX: 0 }} animate={{ scaleX: used }} transition={{ duration: 0.8 }} /></span>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Pencil className="size-3.5" />Edit</Button>
                      <Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50" aria-label={`Delete ${c.code}`} onClick={() => remove(c.id).then(() => toast.success("Coupon deleted")).catch((e: Error) => toast.error(e.message))}><Trash2 className="size-3.5" />Delete</Button>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing && coupons.some((c) => c.id === editing.id) ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          {editing && (
            <form id="coupon" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <Field label="Code" htmlFor="co-code" error={errors.code}><Input id="co-code" className="uppercase" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Type">
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as Coupon["kind"] })}>
                  <SelectTrigger className="w-full" aria-label="Type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PERCENT">Percentage</SelectItem><SelectItem value="FLAT">Flat amount</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label={editing.kind === "PERCENT" ? "Percent off" : "Amount off (₹)"} htmlFor="co-value" error={errors.value}><Input id="co-value" type="number" min="1" value={editing.value} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} /></Field>
              <Field label="Minimum order (₹)" htmlFor="co-min"><Input id="co-min" type="number" min="0" value={editing.minOrder} onChange={(e) => setEditing({ ...editing, minOrder: Number(e.target.value) })} /></Field>
              <Field label="Largest discount (₹, optional)" htmlFor="co-max"><Input id="co-max" type="number" min="0" value={editing.maxDiscount ?? ""} onChange={(e) => setEditing({ ...editing, maxDiscount: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Usage limit (optional)" htmlFor="co-limit"><Input id="co-limit" type="number" min="0" value={editing.usageLimit ?? ""} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <div className="sm:col-span-2"><Field label="Description" htmlFor="co-desc"><Input id="co-desc" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field></div>
            </form>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="coupon">Save coupon</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
