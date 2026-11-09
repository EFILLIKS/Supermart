import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Percent, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Float, Reveal, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { ProductCard } from "@/components/shared";
import { recommend } from "@/lib/ai";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/store";

const SLIDES = [
  { kicker: "This week's harvest", title: "Mangoes worth waiting all year for", body: "Naturally ripened Alphonso from Ratnagiri, picked at the right week.", cta: "Shop fruits", to: "/shop/products?category=fruits", bg: "from-amber-200 via-orange-100 to-amber-50", images: ["alphonso-mango", "strawberries", "pomegranate"], ink: "text-[#4a2b05]" },
  { kicker: "Use code WELCOME15", title: "15% off your first basket", body: "Up to ₹150 off, on baskets over ₹299. It takes one tap at checkout.", cta: "Fill your basket", to: "/shop/products", bg: "from-emerald-300 via-emerald-200 to-emerald-50", images: ["broccoli", "vine-tomato", "carrot"], ink: "text-[#0f3d2e]" },
  { kicker: "Baked before sunrise", title: "Bakery, still warm", body: "A 36-hour sourdough, layered croissants, and muffins full of whole berries.", cta: "Visit the bakery", to: "/shop/products?category=bakery", bg: "from-orange-200 via-amber-100 to-yellow-50", images: ["sourdough-loaf", "butter-croissant", "blueberry-muffin"], ink: "text-[#4a2b05]" },
];

function HeroCarousel() {
  const [[index, dir], setSlide] = useState([0, 1]);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const go = (d: number) => setSlide(([i]) => [(i + d + SLIDES.length) % SLIDES.length, d]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section aria-roledescription="carousel" aria-label="Offers" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative h-[510px] overflow-hidden rounded-[2rem] md:h-[420px]">
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div key={index} custom={dir} variants={{ enter: (d: number) => ({ x: `${d * 100}%` }), center: { x: 0 }, exit: (d: number) => ({ x: `${d * -100}%` }) }} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 180, damping: 28 }} className={`absolute inset-0 grid bg-gradient-to-br md:grid-cols-2 ${slide.bg}`}>
          <div className={`relative z-10 flex flex-col p-7 md:justify-center md:p-14 md:pb-16 ${slide.ink}`}>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-sm font-bold tracking-wide">{slide.kicker}</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mt-2 text-4xl leading-[1.05] font-medium lg:text-[3.4rem]">{slide.title}</motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mt-3 max-w-md text-sm opacity-85 md:text-base">{slide.body}</motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }} className="mt-5"><Button asChild size="lg" className="rounded-full bg-[#0f3d2e] hover:bg-[#0b2e23]"><Link to={slide.to}>{slide.cta}<ArrowRight className="size-4" /></Link></Button></motion.div>
          </div>
          <div className="pointer-events-none absolute right-0 bottom-14 h-44 w-3/5 md:relative md:bottom-0 md:h-full md:w-full" aria-hidden>
            {slide.images.map((img, i) => (
              <motion.div key={img} className={`absolute ${i > 0 ? "hidden md:block" : "max-md:!right-0 max-md:!bottom-0 max-md:!w-40"}`} style={{ right: `${[8, 42, 62][i]}%`, bottom: `${[12, 44, 6][i]}%`, width: ["44%", "30%", "27%"][i] }} initial={{ scale: 0.3, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 13, delay: 0.2 + i * 0.12 }}>
                <Float distance={10 + i * 3} duration={4 + i} delay={i * 0.5}><img src={`/images/products/${img}.svg`} alt="" className="max-h-44 w-full object-contain drop-shadow-xl md:max-h-none" /></Float>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute right-5 bottom-5 z-20 flex gap-2">
        <Button size="icon" variant="secondary" className="rounded-full bg-white/80" onClick={() => go(-1)} aria-label="Previous offer"><ChevronLeft className="size-5" /></Button>
        <Button size="icon" variant="secondary" className="rounded-full bg-white/80" onClick={() => go(1)} aria-label="Next offer"><ChevronRight className="size-5" /></Button>
      </div>
      <div className="absolute bottom-7 left-7 z-20 flex gap-2 md:left-14">
        {SLIDES.map((s, i) => <button key={s.title} type="button" onClick={() => setSlide([i, i > index ? 1 : -1])} aria-label={`Offer ${i + 1}`} aria-current={i === index} className="relative h-2 w-8 overflow-hidden rounded-full bg-black/15">{i === index && <motion.span layoutId="dot" key={paused ? "p" : "r"} className="absolute inset-0 origin-left rounded-full bg-[#0f3d2e]" initial={{ scaleX: paused ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: paused ? 0 : 6, ease: "linear" }} />}</button>)}
      </div>
    </section>
  );
}

export default function Home() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const session = useStore((s) => s.session);
  const settings = useStore((s) => s.settings);

  const picks = useMemo(() => recommend(products, orders, session?.customerId, [], 8), [products, orders, session?.customerId]);
  const deals = useMemo(() => [...products].filter((p) => p.active && p.stock > 0).sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp).slice(0, 4), [products]);

  return (
    <div className="space-y-12">
      <HeroCarousel />

      <Stagger className="grid gap-3 md:grid-cols-3" gap={0.08}>
        {[
          { icon: Truck, title: `Free delivery over ${formatMoney(settings.freeDeliveryOver)}`, body: `Otherwise a flat ${formatMoney(settings.deliveryFee)}` },
          { icon: Percent, title: "WEEKEND10 at checkout", body: "10% off, up to ₹200" },
          { icon: Sparkles, title: "Ask the assistant", body: "Search by meal, diet, or budget", to: "/shop/assistant" },
        ].map((x) => (
          <StaggerItem key={x.title}>
            <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><x.icon className="size-5" aria-hidden /></span>
              <div><p className="text-sm font-bold">{x.to ? <Link to={x.to} className="hover:text-primary">{x.title}</Link> : x.title}</p><p className="text-xs text-muted-foreground">{x.body}</p></div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <section aria-labelledby="aisles">
        <Reveal><h2 id="aisles" className="mb-4 text-3xl font-medium">Shop by aisle</h2></Reveal>
        <Stagger onView gap={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.filter((c) => c.active).map((c) => (
            <StaggerItem key={c.id}>
              <Tilt max={10}>
                <Link to={`/shop/products?category=${c.slug}`} className="group block rounded-3xl border bg-card p-3 text-center transition-colors hover:border-primary">
                  <img src={c.image} alt="" loading="lazy" className="mx-auto aspect-square w-full transition-transform duration-500 group-hover:scale-110" />
                  <span className="mt-1 block text-sm font-semibold">{c.name}</span>
                </Link>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="picks">
        <Reveal>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><h2 id="picks" className="text-3xl font-medium">{session?.role === "CUSTOMER" ? `Picked for you, ${session.name.split(" ")[0]}` : "Popular right now"}</h2><p className="text-sm text-muted-foreground">{picks.reason}</p></div>
            <Button asChild variant="ghost"><Link to="/shop/products">See everything<ArrowRight className="size-4" /></Link></Button>
          </div>
        </Reveal>
        <Stagger onView className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{picks.items.map((p) => <StaggerItem key={p.id}><ProductCard product={p} /></StaggerItem>)}</Stagger>
      </section>

      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b2e23] p-8 text-white md:p-12">
          <img src="/images/scenes/delivery-van.svg" alt="" aria-hidden className="absolute -right-8 -bottom-4 w-64 opacity-95 md:w-96" />
          <h2 className="max-w-lg text-3xl font-medium md:text-4xl">Turn a recipe into a list, and a list into a basket.</h2>
          <p className="mt-2 max-w-md text-sm text-emerald-50/75">Your smart list matches what you type to products in the store and shows what is in stock.</p>
          <Button asChild size="lg" variant="secondary" className="mt-5 rounded-full"><Link to="/shop/list">Open smart list</Link></Button>
        </section>
      </Reveal>

      <section aria-labelledby="deals">
        <Reveal><h2 id="deals" className="mb-4 text-3xl font-medium">Biggest savings today</h2></Reveal>
        <Stagger onView className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{deals.map((p) => <StaggerItem key={p.id}><ProductCard product={p} /></StaggerItem>)}</Stagger>
      </section>
    </div>
  );
}
