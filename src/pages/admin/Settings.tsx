import { Database, FlaskConical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, Panel } from "@/components/shared";
import { isLive } from "@/lib/supabase";
import { useStore } from "@/store";

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const save = useStore((s) => s.saveSettings);
  const reset = useStore((s) => s.resetDemo);
  const [form, setForm] = useState(settings);
  const [confirming, setConfirming] = useState(false);
  const num = (k: "freeDeliveryOver" | "deliveryFee" | "driverPayout") => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Math.max(0, Number(e.target.value)) });

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Panel title="Store">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(form).then(() => toast.success("Settings saved")).catch((err: Error) => toast.error(err.message)); }}>
            <Field label="Store name" htmlFor="s-name"><Input id="s-name" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></Field>
            <Field label="Support phone" htmlFor="s-phone"><Input id="s-phone" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></Field>
            <Field label="Free delivery over (₹)" htmlFor="s-free"><Input id="s-free" type="number" min="0" value={form.freeDeliveryOver} onChange={num("freeDeliveryOver")} /></Field>
            <Field label="Delivery fee (₹)" htmlFor="s-fee"><Input id="s-fee" type="number" min="0" value={form.deliveryFee} onChange={num("deliveryFee")} /></Field>
            <Field label="Driver payout per drop (₹)" htmlFor="s-pay"><Input id="s-pay" type="number" min="0" value={form.driverPayout} onChange={num("driverPayout")} /></Field>
            <div className="sm:col-span-2"><Button type="submit" className="rounded-full">Save changes</Button></div>
          </form>
        </Panel>
        <div className="space-y-5">
          <Panel title="Connections">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3"><Database className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span><strong>Database: {isLive ? "Supabase connected" : "Demo mode"}</strong><br /><span className="text-muted-foreground">{isLive ? "Data is stored in your Supabase project." : "Data stays in this browser. Set the Supabase keys to go live."}</span></span></li>
              <li className="flex items-start gap-3"><FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden /><span><strong>AI provider: not connected</strong><br /><span className="text-muted-foreground">The assistant and insights use local rules and statistics.</span></span></li>
              <li className="flex items-start gap-3"><FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden /><span><strong>Payment gateway: not connected</strong><br /><span className="text-muted-foreground">Checkout is a test interface. No money moves.</span></span></li>
            </ul>
          </Panel>
          {!isLive && (
            <Panel title="Demo data">
              <p className="mb-3 text-sm text-muted-foreground">Restores the original catalogue and orders, and removes everything added since.</p>
              {confirming ? (
                <div className="flex gap-2"><Button variant="destructive" onClick={() => { reset(); setForm(useStore.getState().settings); setConfirming(false); toast.success("Demo data restored"); }}>Yes, reset everything</Button><Button variant="ghost" onClick={() => setConfirming(false)}>Keep my changes</Button></div>
              ) : <Button variant="outline" onClick={() => setConfirming(true)}><RotateCcw className="size-4" />Reset demo data</Button>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
