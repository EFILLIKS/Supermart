import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo, PageSkeleton } from "@/components/shared";
import { RouteBoundary } from "@/components/RouteBoundary";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

/** Enter-only: an exit animation around an Outlet would show the next route's content leaving. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/** A deep-green rail for staff portals. The active pill glides between links. */
export function PortalShell({ portal, nav }: { portal: string; nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  const rail = (
    <div className="flex h-full flex-col bg-[#0b2e23] text-emerald-50">
      <div className="px-5 pt-6 pb-5"><Logo light /><p className="mt-3 inline-block rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold tracking-widest text-emerald-200 uppercase">{portal}</p></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3" aria-label={`${portal} navigation`}>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="relative block rounded-xl">
            {({ isActive }) => (
              <span className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "text-[#0b2e23]" : "text-emerald-100/80 hover:text-white")}>
                {isActive && <motion.span layoutId={`rail-${portal}`} className="absolute inset-0 rounded-xl bg-emerald-200" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <item.icon className="relative size-[18px]" aria-hidden />
                <span className="relative flex-1">{item.label}</span>
                {!!item.badge && <span className={cn("relative rounded-full px-2 text-xs font-bold", isActive ? "bg-[#0b2e23] text-white" : "bg-emerald-400/20")}>{item.badge}</span>}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{session?.name}</p>
        <p className="truncate text-xs text-emerald-100/60">{session?.email}</p>
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-emerald-100 hover:bg-white/10 hover:text-white" onClick={async () => { await logout(); navigate("/login"); }}><LogOut className="size-4" />Sign out</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64 print:pl-0">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block print:hidden">{rail}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <Logo />
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-72 shadow-2xl" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
              {rail}
              <Button variant="ghost" size="icon" className="absolute top-4 right-3 text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="size-5" /></Button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="mx-auto max-w-[1400px] p-4 md:p-7">
        <RouteBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <PageTransition><Outlet /></PageTransition>
          </Suspense>
        </RouteBoundary>
      </main>
    </div>
  );
}
