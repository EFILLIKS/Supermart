import { Info, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable, Field, PageHeader, Panel } from "@/components/shared";
import { formatDate } from "@/lib/format";
import { isLive } from "@/lib/supabase";
import { useStore } from "@/store";
import type { Employee, Role } from "@/types";

const ROLES: { value: Role; label: string; access: string }[] = [
  { value: "ADMIN", label: "Admin", access: "Everything: catalogue, orders, staff, and settings" },
  { value: "SALES", label: "Sales", access: "Billing counter, invoices, and customer lookup" },
  { value: "DELIVERY", label: "Delivery", access: "Only the orders assigned to them" },
];

export default function Employees() {
  const employees = useStore((s) => s.employees);
  const session = useStore((s) => s.session);
  const upsert = useStore((s) => s.upsertEmployee);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSelf = (e: Employee) => e.id === session?.userId;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const problems: Record<string, string> = {};
    if (!editing.name.trim()) problems.name = "Enter a name.";
    if (!/^\S+@\S+\.\S+$/.test(editing.email)) problems.email = "Enter a valid email.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    try {
      await upsert(editing);
      toast.success("Employee saved");
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const change = (emp: Employee, patch: Partial<Employee>) => upsert({ ...emp, ...patch }).then(() => toast.success("Updated")).catch((e: Error) => toast.error(e.message));

  return (
    <div>
      <PageHeader title="Employees and roles" subtitle={`${employees.filter((e) => e.active).length} active staff`} actions={!isLive && <Button className="rounded-full" onClick={() => setEditing({ id: `emp-${Date.now()}`, name: "", email: "", phone: "", role: "SALES", code: `SM-${1000 + employees.length}`, department: "Front Counter", shift: "Morning", active: true, hiredOn: new Date().toISOString() })}><Plus className="size-4" />Add employee</Button>} />
      {isLive && <p className="mb-4 flex items-start gap-2 rounded-2xl border bg-card p-3 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />New staff sign up for an account first. They then appear here once you give them a staff role in the database, as the README explains.</p>}
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {ROLES.map((r) => <div key={r.value} className="rounded-2xl border bg-card p-4"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" aria-hidden />{r.label}<span className="ml-auto text-xs font-bold text-muted-foreground">{employees.filter((e) => e.role === r.value).length}</span></p><p className="mt-1 text-xs text-muted-foreground">{r.access}</p></div>)}
      </div>
      <Panel>
        <DataTable<Employee>
          rows={employees} rowKey={(e) => e.id} empty="No staff yet."
          columns={[
            { header: "Employee", cell: (e) => <span><span className="block font-semibold">{e.name}{isSelf(e) && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</span><span className="text-xs text-muted-foreground">{e.email}</span></span> },
            { header: "Code", cell: (e) => e.code },
            { header: "Department", cell: (e) => <span>{e.department}<span className="block text-xs text-muted-foreground">{e.shift} shift</span></span> },
            { header: "Hired", cell: (e) => formatDate(e.hiredOn) },
            { header: "Role", cell: (e) => (
              <Select value={e.role} disabled={isSelf(e)} onValueChange={(v) => void change(e, { role: v as Role })}>
                <SelectTrigger size="sm" className="w-32" aria-label={`Role of ${e.name}`}><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            ) },
            { header: "Active", cell: (e) => <Switch checked={e.active} disabled={isSelf(e)} aria-label={`${e.name} active`} onCheckedChange={(v) => void change(e, { active: v })} /> },
          ]}
        />
      </Panel>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add an employee</DialogTitle></DialogHeader>
          {editing && (
            <form id="emp" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" htmlFor="e-name" error={errors.name}><Input id="e-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Email" htmlFor="e-email" error={errors.email}><Input id="e-email" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Phone" htmlFor="e-phone"><Input id="e-phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Department" htmlFor="e-dept"><Input id="e-dept" value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} /></Field>
              <Field label="Role">
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as Role })}>
                  <SelectTrigger className="w-full" aria-label="Role"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Shift">
                <Select value={editing.shift} onValueChange={(v) => setEditing({ ...editing, shift: v })}>
                  <SelectTrigger className="w-full" aria-label="Shift"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Morning", "Evening", "General"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </form>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="emp">Add employee</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
