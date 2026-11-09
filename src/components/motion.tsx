import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "framer-motion";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SPRING = { type: "spring", stiffness: 320, damping: 26 } as const;
export const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Fades and rises into view once, when scrolled to. */
export function Reveal({ children, delay = 0, className, y = 22 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.65, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Children using <StaggerItem> enter one after another. Animates on mount by default. */
export function Stagger({ children, className, gap = 0.06, onView = false }: { children: ReactNode; className?: string; gap?: number; onView?: boolean }) {
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: gap } } };
  return (
    <motion.div className={className} variants={variants} initial="hidden" {...(onView ? { whileInView: "show", viewport: { once: true, margin: "-40px" } } : { animate: "show" })}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={fadeUp}>{children}</motion.div>;
}

/** Each word rises from behind a mask. */
export function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden className="mr-[0.24em] inline-block overflow-hidden pb-[0.12em] align-bottom last:mr-0">
          <motion.span className="inline-block" initial={{ y: "110%", rotate: 4 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 0.85, delay: delay + i * 0.07, ease: EASE }}>
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Rolls a number up from zero when it scrolls into view, and to each new value afterwards. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const last = useRef(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced) {
      node.textContent = format(value);
      return;
    }
    if (!inView) return;
    const controls = animate(last.current, value, { duration: 1.2, ease: EASE, onUpdate: (v) => { node.textContent = format(v); } });
    last.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduced]);
  return <span ref={ref} className={cn("tabular-nums", className)}>{format(reduced ? value : 0)}</span>;
}

/** 3D card tilt following the pointer. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 220, damping: 20 });
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle endless bobbing, used for floating produce. */
export function Float({ children, className, distance = 12, duration = 5, delay = 0 }: { children: ReactNode; className?: string; distance?: number; duration?: number; delay?: number }) {
  return (
    <motion.div className={className} animate={{ y: [0, -distance, 0], rotate: [0, 2.5, 0] }} transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}

const CONFETTI = ["#047857", "#10b981", "#f59e0b", "#f97316", "#a7f3d0", "#e11d48"];

/** A one-shot burst, used to celebrate a placed order or a confirmed delivery. */
export function Confetti({ count = 44 }: { count?: number }) {
  const reduced = useReducedMotion();
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random();
    const reach = 130 + Math.random() * 230;
    return { i, x: Math.cos(angle) * reach, y: Math.sin(angle) * reach - 70, rotate: Math.random() * 720 - 360, size: 6 + Math.random() * 7, color: CONFETTI[i % CONFETTI.length], round: i % 3 === 0, delay: Math.random() * 0.12 };
  }), [count]);
  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 z-20">
      {bits.map((b) => (
        <motion.span key={b.i} className="absolute block" style={{ width: b.size, height: b.size, background: b.color, borderRadius: b.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: b.x, y: [0, b.y, b.y + 240], opacity: [1, 1, 0], rotate: b.rotate, scale: 1 }} transition={{ duration: 1.7, delay: b.delay, ease: "easeOut" }} />
      ))}
    </div>
  );
}

/** Sends a copy of a product image flying to the basket icon, then bumps the icon. */
export function flyToCart(source: Element | null, image: string) {
  const target = document.querySelector("[data-cart-target]");
  if (!target) return;
  const bump = () => target.animate([{ transform: "scale(1)" }, { transform: "scale(1.28) rotate(-8deg)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
  if (!source || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bump();
    return;
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = document.createElement("img");
  ghost.src = image;
  ghost.alt = "";
  ghost.style.cssText = `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;z-index:90;pointer-events:none;object-fit:contain`;
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.12, 28 / from.width);
  const flight = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.25 - 70}px) scale(.62) rotate(-14deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(14deg)`, opacity: 0.35 },
    ],
    { duration: 720, easing: "cubic-bezier(.45,.05,.3,1)" },
  );
  flight.onfinish = () => { ghost.remove(); bump(); };
  flight.oncancel = () => ghost.remove();
}
