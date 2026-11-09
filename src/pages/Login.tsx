import { motion } from "framer-motion";
import { ArrowRight, ChartNoAxesCombined, ScanBarcode, ShoppingBasket, Truck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Float } from "@/components/motion";
import { Field, Logo } from "@/components/shared";
import * as backend from "@/lib/backend";
import { isLive } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import type { Role } from "@/types";

const HOME: Record<Role, string> = { CUSTOMER: "/shop", ADMIN: "/admin", SALES: "/sales", DELIVERY: "/delivery" };
const PERSONAS: { role: Role; title: string; who: string; icon: LucideIcon }[] = [
  { role: "CUSTOMER", title: "Customer", who: "Ananya Rao", icon: ShoppingBasket },
  { role: "ADMIN", title: "Admin", who: "Nisha Verma", icon: ChartNoAxesCombined },
  { role: "SALES", title: "Sales", who: "Rahul Pawar", icon: ScanBarcode },
  { role: "DELIVERY", title: "Delivery", who: "Imran Qureshi", icon: Truck },
];

/** Only same-site paths are honoured, so that a crafted link cannot redirect off the site. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

function DemoSignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useStore((s) => s.loginDemo);
  const wanted = params.get("role") as Role | null;
  const next = safeNext(params.get("next"));
  return (
    <>
      <h1 className="text-4xl font-medium text-[#0f3d2e]">Choose a demo account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Demo mode: no password, because no real data is involved. Connect Supabase to turn on real accounts.</p>
      <motion.ul className="mt-6 space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
        {PERSONAS.map((p) => (
          <motion.li key={p.role} variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0 } }}>
            <motion.button
              whileHover={{ x: 6 }} whileTap={{ scale: 0.98 }} type="button"
              onClick={() => { login(p.role); navigate(wanted === p.role && next ? next : HOME[p.role]); }}
              className={cn("group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary", wanted === p.role && "border-primary ring-2 ring-primary/20")}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><p.icon className="size-5" aria-hidden /></span>
              <span className="flex-1"><span className="block font-semibold">{p.title}</span><span className="block text-xs text-muted-foreground">Sign in as {p.who}</span></span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}

function LiveSignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        await backend.signUp(email, password, name);
        toast.success("Account created. Check your email if confirmation is on.");
      }
      await backend.signIn(email, password);
      const session = await backend.currentSession();
      useStore.setState({ session });
      await useStore.getState().refresh();
      navigate(safeNext(params.get("next")) ?? HOME[session?.role ?? "CUSTOMER"]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-4xl font-medium text-[#0f3d2e]">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "up" && <Field label="Full name" htmlFor="name"><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
        <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Password" htmlFor="password" hint={mode === "up" ? "At least 8 characters." : undefined}><Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></Field>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>{busy ? "Please wait" : mode === "in" ? "Sign in" : "Create account"}</Button>
      </form>
      <button type="button" className="mt-4 text-sm font-semibold text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
    </>
  );
}

export default function Login() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b2e23] lg:block">
        <img aria-hidden src="/images/scenes/farm-hills.svg" alt="" className="absolute inset-x-0 bottom-0 w-full opacity-40" />
        <Float className="absolute top-[14%] left-[14%] w-40" distance={18}><img src="/images/products/alphonso-mango.svg" alt="" /></Float>
        <Float className="absolute top-[12%] right-[14%] w-32" distance={14} delay={0.8}><img src="/images/products/toned-milk.svg" alt="" /></Float>
        <Float className="absolute top-[46%] left-[38%] w-48" distance={20} delay={1.4}><img src="/images/products/broccoli.svg" alt="" /></Float>
        <motion.img src="/images/scenes/delivery-van.svg" alt="" aria-hidden className="absolute bottom-[9%] w-80" initial={{ left: "-40%" }} animate={{ left: "34%" }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
      </div>
      <div className="flex flex-col justify-center px-6 py-10 sm:px-14">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-10 inline-block"><Logo /></Link>
          {isLive ? <LiveSignIn /> : <DemoSignIn />}
        </div>
      </div>
    </div>
  );
}
