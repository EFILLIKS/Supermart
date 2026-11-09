import { AnimatePresence, motion } from "framer-motion";
import { Gift, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountUp } from "@/components/motion";
import { EmptyState, Field, PageHeader, Panel } from "@/components/shared";
import { useStore } from "@/store";

export function AddressForm() {
  const addAddress = useStore((s) => s.addAddress);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "Home", line1: "", line2: "", city: "Pune", state: "Maharashtra", postalCode: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (!form.line1.trim()) problems.line1 = "Enter your house and street.";
    if (!form.city.trim()) problems.city = "Enter a city.";
    if (!/^\d{6}$/.test(form.postalCode)) problems.postalCode = "Enter a 6 digit PIN code.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    try {
      await addAddress({ ...form, line2: form.line2 || undefined });
      toast.success("Address saved");
      setOpen(false);
      setForm({ ...form, line1: "", line2: "", postalCode: "" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      {!open && <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(true)}><Plus className="size-4" />Add a new address</Button>}
      <AnimatePresence>
        {open && (
          <motion.form onSubmit={submit} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-3 overflow-hidden sm:grid-cols-2">
            <Field label="Label" htmlFor="a-label"><Input id="a-label" value={form.label} onChange={set("label")} /></Field>
            <Field label="House and street" htmlFor="a-line1" error={errors.line1}><Input id="a-line1" value={form.line1} onChange={set("line1")} autoComplete="address-line1" /></Field>
            <Field label="Area (optional)" htmlFor="a-line2"><Input id="a-line2" value={form.line2} onChange={set("line2")} autoComplete="address-line2" /></Field>
            <Field label="City" htmlFor="a-city" error={errors.city}><Input id="a-city" value={form.city} onChange={set("city")} autoComplete="address-level2" /></Field>
            <Field label="State" htmlFor="a-state"><Input id="a-state" value={form.state} onChange={set("state")} autoComplete="address-level1" /></Field>
            <Field label="PIN code" htmlFor="a-pin" error={errors.postalCode}><Input id="a-pin" inputMode="numeric" value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" /></Field>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" className="rounded-full">Save address</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Account() {
  const session = useStore((s) => s.session);
  const customer = useStore((s) => s.customers.find((c) => c.id === s.session?.customerId));
  return (
    <div>
      <PageHeader title={`Hello, ${session?.name.split(" ")[0] ?? "there"}`} subtitle={session?.email} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Saved addresses">
          {!customer?.addresses.length ? <EmptyState icon={MapPin} title="No addresses yet" body="Add one to speed up checkout." /> : (
            <ul className="mb-4 grid gap-3 sm:grid-cols-2">
              {customer.addresses.map((a) => <motion.li layout key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border p-4"><p className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-primary" aria-hidden />{a.label}</p><p className="mt-1 text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}</p></motion.li>)}
            </ul>
          )}
          <AddressForm />
        </Panel>
        <Panel title="Loyalty points">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-accent text-primary"><Gift className="size-6" aria-hidden /></span><p className="font-display text-4xl font-semibold"><CountUp value={customer?.loyaltyPoints ?? 0} /></p></div>
          <p className="mt-2 text-xs text-muted-foreground">Earned on in-store purchases, at 1 point for every ₹100.</p>
        </Panel>
      </div>
    </div>
  );
}
