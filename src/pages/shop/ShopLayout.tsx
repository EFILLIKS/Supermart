import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Bot, ClipboardList, Heart, LogOut, MapPin, Menu, Package, Search, ShoppingBasket, UserRound, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AssistantChat } from "@/components/Assistant";
import { PageTransition } from "@/components/PortalShell";
import { RouteBoundary } from "@/components/RouteBoundary";
import { GridSkeleton, Logo } from "@/components/shared";
import { cn } from "@/lib/utils";
import { selectCartCount, useStore } from "@/store";

const LINKS = [
  { to: "/shop", label: "Home", end: true },
  { to: "/shop/products", label: "All products" },
  { to: "/shop/list", label: "Smart list" },
  { to: "/shop/assistant", label: "Assistant" },
];

export default function ShopLayout() {
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const [hidden, setHidden] = useState(false);
  const count = useStore(selectCartCount);
  const wishCount = useStore((s) => s.wishlist.length);
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { scrollY } = useScroll();

  // The header slides away when reading down the page and returns on scrolling up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240);
  });

  useEffect(() => { setMenu(false); setChat(false); window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <motion.header animate={{ y: hidden ? "-100%" : 0 }} transition={{ duration: 0.28, ease: "easeInOut" }} className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-5">
          <button type="button" className="grid size-10 place-items-center rounded-lg md:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <Link to="/shop" className="shrink-0" aria-label="Supermart AI home"><Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" /></Link>
          <form role="search" className="relative flex-1" onSubmit={(e) => { e.preventDefault(); navigate(`/shop/products?q=${encodeURIComponent(q.trim())}`); }}>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mangoes, atta, oat cookies" aria-label="Search products" className="h-11 rounded-full bg-muted/70 pl-10" />
          </form>
          <Link to="/shop/wishlist" className="relative hidden size-10 place-items-center rounded-full hover:bg-accent sm:grid" aria-label={`Wishlist, ${wishCount} items`}>
            <Heart className="size-5" aria-hidden />
            {wishCount > 0 && <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{wishCount}</span>}
          </Link>
          <Link to="/shop/cart" data-cart-target className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white" aria-label={`Basket, ${count} items`}>
            <ShoppingBasket className="size-5" aria-hidden />
            <AnimatePresence>
              {count > 0 && <motion.span key={count} initial={{ scale: 0.3 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 520, damping: 15 }} className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-[#0f3d2e]">{count}</motion.span>}
            </AnimatePresence>
          </Link>
          {session?.role === "CUSTOMER" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="Account menu"><UserRound className="size-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{session.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/shop/orders"><Package className="size-4" />Orders</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/shop/account"><MapPin className="size-4" />Addresses</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { void logout(); navigate("/shop"); }}><LogOut className="size-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to={`/login?role=CUSTOMER&next=${encodeURIComponent(pathname)}`}>Sign in</Link></Button>
          )}
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-4 pb-2 md:flex" aria-label="Shop">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="relative rounded-full px-3.5 py-1.5 text-sm font-medium">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="shop-nav" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className={cn("relative", isActive && "text-primary")}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {session?.role === "CUSTOMER" && <NavLink to="/shop/orders" className={({ isActive }) => cn("rounded-full px-3.5 py-1.5 text-sm font-medium", isActive && "bg-accent text-primary")}>Orders</NavLink>}
        </nav>
      </motion.header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <RouteBoundary>
          <Suspense fallback={<GridSkeleton />}>
            <PageTransition><Outlet /></PageTransition>
          </Suspense>
        </RouteBoundary>
      </main>

      <footer className="mt-12 border-t py-8 text-center text-xs text-muted-foreground print:hidden">
        <p>All images and packaging are original artwork. Brands are fictional. Delivery in Pune (demo).</p>
        <Link to="/" className="mt-1 inline-block font-semibold text-primary hover:underline">About this project</Link>
      </footer>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 backdrop-blur md:hidden print:hidden" aria-label="Quick links">
        {[{ to: "/shop", label: "Home", icon: ShoppingBasket, end: true }, { to: "/shop/list", label: "List", icon: ClipboardList }, { to: "/shop/wishlist", label: "Wishlist", icon: Heart }, { to: "/shop/orders", label: "Orders", icon: Package }].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <t.icon className="size-5" aria-hidden />{t.label}
          </NavLink>
        ))}
      </nav>

      {/* Floating assistant */}
      {pathname !== "/shop/assistant" && (
        <motion.button type="button" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => setChat(true)} aria-label="Open shopping assistant" className="fixed right-4 bottom-20 z-40 grid size-14 place-items-center rounded-full bg-[#0f3d2e] text-white shadow-xl md:bottom-6 print:hidden">
          <motion.span aria-hidden className="absolute inset-0 rounded-full bg-emerald-500" animate={{ scale: [1, 1.45], opacity: [0.45, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
          <Bot className="relative size-6" aria-hidden />
        </motion.button>
      )}
      <AnimatePresence>
        {chat && (
          <motion.div role="dialog" aria-label="Shopping assistant" initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.95 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} style={{ transformOrigin: "bottom right" }} className="fixed inset-x-3 bottom-3 z-50 h-[78dvh] overflow-hidden rounded-3xl border bg-card shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:h-[620px] md:w-[410px]">
            <Button variant="secondary" size="icon" className="absolute top-2.5 right-2.5 z-10 size-8 rounded-full" onClick={() => setChat(false)} aria-label="Close assistant"><X className="size-4" /></Button>
            <AssistantChat compact />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMenu(false)} />
            <motion.nav aria-label="Menu" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 bg-background p-5">
              <Logo className="mb-5" />
              {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("rounded-xl px-3 py-2.5 font-medium", isActive && "bg-accent text-primary")}>{l.label}</NavLink>)}
              <NavLink to="/shop/account" className="rounded-xl px-3 py-2.5 font-medium">Account</NavLink>
              {session ? <button type="button" className="mt-auto rounded-xl px-3 py-2.5 text-left font-medium" onClick={() => void logout()}>Sign out</button> : <Link to="/login?role=CUSTOMER" className="mt-auto rounded-xl px-3 py-2.5 font-medium text-primary">Sign in</Link>}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
