import { motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, ArrowUpRight, Bot, ChartNoAxesCombined, CheckCircle2, MapPinned, PackageCheck, ReceiptText, ScanBarcode, ShieldCheck, ShoppingBasket, Sparkles, Truck, UserRound } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CountUp, Float, Reveal, Stagger, StaggerItem, Tilt, WordReveal } from "@/components/motion";
import { Logo, SimulatedAiBadge } from "@/components/shared";
import { CATEGORIES, PRODUCTS } from "@/data/catalog";

const FLOATERS: { slug: string; cls: string; depth: number; size: string; delay: number }[] = [
  { slug: "alphonso-mango", cls: "left-[1%] top-[10%]", depth: 34, size: "w-24 md:w-32", delay: 0 },
  { slug: "broccoli", cls: "right-[3%] top-[0%]", depth: 22, size: "w-24 md:w-36", delay: 0.6 },
  { slug: "strawberries", cls: "left-[18%] -top-[6%]", depth: 14, size: "w-20 md:w-24", delay: 1.1 },
  { slug: "hass-avocado", cls: "right-[-2%] top-[40%]", depth: 40, size: "w-20 md:w-28", delay: 0.3 },
  { slug: "butter-croissant", cls: "-left-[4%] top-[50%]", depth: 28, size: "w-24 md:w-28", delay: 0.9 },
  { slug: "toned-milk", cls: "right-[24%] -top-[10%]", depth: 18, size: "w-16 md:w-24", delay: 1.4 },
];

const PORTALS = [
  { to: "/shop", title: "Customer", icon: ShoppingBasket, image: "/images/scenes/market-crate.svg", tone: "from-emerald-100 to-emerald-50", body: "Browse, search with the assistant, keep a smart list, check out, and follow an order to the door." },
  { to: "/login?role=ADMIN&next=/admin", title: "Admin", icon: ChartNoAxesCombined, image: "/images/categories/staples.svg", tone: "from-amber-100 to-orange-50", body: "Revenue, stock movements, staff roles, coupons and delivery. Includes stock forecasts drawn from sales." },
  { to: "/login?role=SALES&next=/sales", title: "Sales", icon: ScanBarcode, image: "/images/categories/snacks.svg", tone: "from-rose-100 to-orange-50", body: "A fast billing counter with barcode entry, discounts, GST, cash and UPI, and a printable invoice." },
  { to: "/login?role=DELIVERY&next=/delivery", title: "Delivery", icon: Truck, image: "/images/scenes/delivery-van.svg", tone: "from-sky-100 to-cyan-50", body: "Assigned drops, addresses, navigation, code-confirmed handover, and a running view of earnings." },
];

const JOURNEY = [
  { icon: ShoppingBasket, who: "Customer", title: "An order is placed", body: "The server checks the price and stock, then takes the items off the shelf count." },
  { icon: PackageCheck, who: "Admin", title: "The store packs it", body: "It appears in the order queue at once, ready to confirm, pack, and assign to a driver." },
  { icon: Truck, who: "Delivery", title: "The driver sets off", body: "It lands in the driver's list with the address. The customer sees it move on their map." },
  { icon: ShieldCheck, who: "Handover", title: "A code closes the loop", body: "Only the customer can see the 6-digit code. The driver must collect it to finish." },
];

function FloatingProduce({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  return (
    <>
      {FLOATERS.map((f) => <Floater key={f.slug} {...f} mx={mx} my={my} />)}
    </>
  );
}

function Floater({ slug, cls, depth, size, delay, mx, my }: (typeof FLOATERS)[number] & { mx: MotionValue<number>; my: MotionValue<number> }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div className={`absolute z-20 ${cls} ${size}`} style={{ x, y }} initial={{ opacity: 0, scale: 0.3, rotate: -24 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.5 + delay * 0.4 }}>
      <Float distance={14} duration={4.5 + delay} delay={delay}>
        <img src={`/images/products/${slug}.svg`} alt="" className="w-full drop-shadow-xl" />
      </Float>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const crateY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const crateScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const hillY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 16 });
  const my = useSpring(rawY, { stiffness: 60, damping: 16 });
  const spotX = useTransform(mx, [-0.5, 0.5], ["25%", "75%"]);
  const spotY = useTransform(my, [-0.5, 0.5], ["20%", "70%"]);
  const spotlight = useMotionTemplate`radial-gradient(620px circle at ${spotX} ${spotY}, rgba(16,185,129,.20), transparent 70%)`;

  return (
    <section
      ref={ref} className="relative overflow-hidden bg-gradient-to-b from-[#e8f7ee] to-background"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        rawX.set((e.clientX - r.left) / r.width - 0.5);
        rawY.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
      <motion.img aria-hidden src="/images/scenes/farm-hills.svg" alt="" className="pointer-events-none absolute inset-x-0 -bottom-[8%] w-full opacity-50" style={{ y: hillY }} />

      <nav className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-medium md:flex">
          <a href="#portals" className="hover:text-primary">Portals</a>
          <a href="#journey" className="hover:text-primary">How it works</a>
          <a href="#assistant" className="hover:text-primary">Assistant</a>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
          <Button asChild className="rounded-full"><Link to="/shop">Start shopping</Link></Button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-5 pt-6 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-12 lg:pb-36">
        <motion.div style={{ y: copyY, opacity: fade }}>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden />One store. Four portals. Shared live data.
          </motion.p>
          <h1 className="text-5xl leading-[1.02] font-medium text-[#0f3d2e] md:text-7xl">
            <WordReveal text="The supermarket" /><br />
            <WordReveal text="that thinks" delay={0.2} /> <em className="text-emerald-600"><WordReveal text="ahead." delay={0.38} /></em>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/75">
            A complete grocery business in one app: the shop your customers love, the counter your staff need, the routes your drivers follow, and the numbers you run it all on.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button asChild size="lg" className="group h-12 rounded-full px-7 text-base"><Link to="/shop">Explore the shop<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-white/70 px-7 text-base"><a href="#portals">See all four portals</a></Button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div className="relative mx-auto mt-10 w-full max-w-xl lg:mt-0" style={{ y: crateY, scale: crateScale }}>
          <FloatingProduce mx={mx} my={my} />
          <motion.img src="/images/scenes/market-crate.svg" alt="A wooden crate overflowing with fruit, vegetables, milk and rice" className="relative z-10 mt-20 w-full" initial={{ opacity: 0, y: 70, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }} />
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...CATEGORIES, ...CATEGORIES];
  return (
    <div className="overflow-hidden border-y bg-card py-4" aria-hidden>
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {items.map((c, i) => <span key={i} className="flex items-center gap-3 font-display text-xl whitespace-nowrap text-[#0f3d2e]"><img src={c.image} alt="" className="size-11" />{c.name}</span>)}
      </div>
    </div>
  );
}

function Facts() {
  const facts = [
    { value: PRODUCTS.length, label: "products in the demo catalogue" },
    { value: CATEGORIES.length, label: "aisles to browse" },
    { value: 4, label: "connected portals" },
    { value: 70, label: "automated database security checks" },
  ];
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-14 md:grid-cols-4">
      {facts.map((f, i) => (
        <Reveal key={f.label} delay={i * 0.08}>
          <p className="font-display text-5xl font-medium text-emerald-700"><CountUp value={f.value} /></p>
          <p className="mt-1 text-sm text-muted-foreground">{f.label}</p>
        </Reveal>
      ))}
    </section>
  );
}

function Portals() {
  return (
    <section id="portals" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-14">
      <Reveal><h2 className="max-w-2xl text-4xl font-medium text-[#0f3d2e] md:text-5xl">Four doors into the same store.</h2></Reveal>
      <Reveal delay={0.08}><p className="mt-3 max-w-xl text-muted-foreground">Sell a mango at the counter and the online shop's stock drops with it. Every portal reads from one source of truth.</p></Reveal>
      <Stagger onView gap={0.1} className="mt-10 grid gap-5 md:grid-cols-2">
        {PORTALS.map((p) => (
          <StaggerItem key={p.title}>
            <Tilt max={5}>
              <Link to={p.to} className={`group relative flex min-h-72 overflow-hidden rounded-[2rem] border bg-gradient-to-br p-7 transition-shadow duration-300 hover:shadow-[0_30px_70px_-30px_rgba(6,78,59,.45)] ${p.tone}`}>
                <div className="relative z-10 max-w-[54%]">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110"><p.icon className="size-6" aria-hidden /></span>
                  <h3 className="mt-5 text-3xl font-medium text-[#0f3d2e]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/75">{p.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">Open portal<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden /></span>
                </div>
                <img src={p.image} alt="" loading="lazy" className="absolute -right-6 -bottom-6 w-[46%] transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-rotate-3" />
              </Link>
            </Tilt>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function JourneyStep({ step, index, progress }: { step: (typeof JOURNEY)[number]; index: number; progress: MotionValue<number> }) {
  const at = index / JOURNEY.length;
  const opacity = useTransform(progress, [at - 0.04, at + 0.04], [0.32, 1]);
  const x = useTransform(progress, [at - 0.04, at + 0.04], [18, 0]);
  const fill = useTransform(progress, [at - 0.04, at + 0.04], ["#ffffff", "#047857"]);
  const ink = useTransform(progress, [at - 0.04, at + 0.04], ["#047857", "#ffffff"]);
  return (
    <motion.li className="flex gap-4" style={{ opacity, x }}>
      <motion.span className="grid size-12 shrink-0 place-items-center rounded-2xl border shadow-sm" style={{ backgroundColor: fill, color: ink }}><step.icon className="size-5" aria-hidden /></motion.span>
      <div>
        <p className="text-xs font-bold tracking-widest text-emerald-300 uppercase">{step.who}</p>
        <h3 className="text-2xl font-medium text-white">{step.title}</h3>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-emerald-50/75">{step.body}</p>
      </div>
    </motion.li>
  );
}

function Journey() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const vanX = useTransform(progress, [0, 1], ["0%", "66%"]);
  const lineScale = useTransform(progress, [0, 1], [0, 1]);
  return (
    <section id="journey" ref={ref} className="relative h-[280vh] scroll-mt-0 bg-[#0b2e23]">
      <div className="sticky top-0 flex min-h-dvh flex-col justify-center overflow-hidden px-5 py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-medium text-white md:text-5xl">Follow one order through the whole business.</h2>
            <p className="mt-3 text-emerald-50/70">Keep scrolling. The same record passes from portal to portal.</p>
            <ol className="mt-8 space-y-6">{JOURNEY.map((s, i) => <JourneyStep key={s.title} step={s} index={i} progress={progress} />)}</ol>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-[2rem] bg-emerald-950/50 p-6 pt-52 ring-1 ring-white/10">
              <img aria-hidden src="/images/scenes/farm-hills.svg" alt="" className="absolute inset-x-0 top-0 h-60 w-full object-cover opacity-30" />
              <div className="relative h-1 rounded bg-white/15"><motion.div className="h-full origin-left rounded bg-emerald-400" style={{ scaleX: lineScale }} /></div>
              <motion.img aria-hidden src="/images/scenes/delivery-van.svg" alt="" className="absolute bottom-[3.4rem] w-1/3 max-w-xs" style={{ left: vanX }} animate={{ y: [0, -2, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />
              <div className="relative mt-5 flex justify-between text-xs font-semibold text-emerald-50/70"><span className="flex items-center gap-1"><UserRound className="size-3.5" aria-hidden />Order placed</span><span className="flex items-center gap-1"><MapPinned className="size-3.5" aria-hidden />On the road</span><span className="flex items-center gap-1"><CheckCircle2 className="size-3.5" aria-hidden />Delivered</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssistantTeaser() {
  const lines = [
    { from: "you", text: "Vegan breakfast under ₹200" },
    { from: "bot", text: "Found matches. Bananas at ₹49, avocados at ₹189, and a multigrain loaf at ₹75." },
    { from: "you", text: "What do I need for dal tadka?" },
    { from: "bot", text: "Toor dal, basmati, tomatoes, onions, turmeric, salt, butter. Add all to your basket?" },
  ];
  return (
    <section id="assistant" className="mx-auto grid max-w-7xl scroll-mt-6 items-center gap-10 px-5 py-20 lg:grid-cols-2">
      <div>
        <Reveal><span className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><Bot className="size-5" aria-hidden />Shopping assistant</span></Reveal>
        <Reveal delay={0.06}><h2 className="text-4xl font-medium text-[#0f3d2e] md:text-5xl">Ask in plain words. Get a basket back.</h2></Reveal>
        <Reveal delay={0.12}><p className="mt-4 max-w-lg text-muted-foreground">Search by meal, diet, or budget. Turn a recipe into a list. In the admin portal, see stock forecasts and sales insights worked out from your real orders.</p></Reveal>
        <Reveal delay={0.18}><div className="mt-5"><SimulatedAiBadge /></div><p className="mt-2 max-w-lg text-xs text-muted-foreground">Today these answers come from local rules and statistics, not a language model. A provider can be connected without changing the interface.</p></Reveal>
        <Reveal delay={0.24}><Button asChild className="mt-6 rounded-full" size="lg"><Link to="/shop/assistant">Try the assistant<ArrowRight className="size-4" /></Link></Button></Reveal>
      </div>
      <Stagger onView gap={0.35} className="space-y-3 rounded-[2rem] border bg-card p-6 shadow-[0_30px_70px_-40px_rgba(6,78,59,.5)]">
        {lines.map((l) => (
          <StaggerItem key={l.text} className={l.from === "you" ? "flex justify-end" : "flex"}>
            <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${l.from === "you" ? "rounded-br-md bg-emerald-700 text-white" : "rounded-bl-md bg-muted"}`}>{l.text}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 pb-16">
      <Reveal>
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-emerald-700 px-8 py-16 text-center text-white">
          <Float className="absolute -left-4 top-6 w-28 opacity-90 md:w-40" distance={16}><img src="/images/products/royal-gala-apple.svg" alt="" /></Float>
          <Float className="absolute -right-4 bottom-2 w-28 opacity-90 md:w-44" distance={18} delay={1}><img src="/images/products/sourdough-loaf.svg" alt="" /></Float>
          <ReceiptText className="mx-auto mb-4 size-8 text-emerald-200" aria-hidden />
          <h2 className="mx-auto max-w-2xl text-4xl font-medium md:text-5xl">Your first basket is a click away.</h2>
          <p className="mx-auto mt-3 max-w-md text-emerald-50/85">Everything runs in your browser on demo data, so explore freely. Nothing is charged.</p>
          <Button asChild size="lg" variant="secondary" className="mt-7 h-12 rounded-full px-8 text-base"><Link to="/shop">Open the shop</Link></Button>
        </div>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  return (
    <div className="overflow-x-clip">
      <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-emerald-500" style={{ scaleX: bar }} />
      <Hero />
      <Marquee />
      <main>
        <Facts />
        <Portals />
        <Journey />
        <AssistantTeaser />
        <FinalCta />
      </main>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <Logo className="mb-3" />
        <p>All product images and packaging are original artwork for this project. Brands shown are fictional.</p>
      </footer>
    </div>
  );
}
