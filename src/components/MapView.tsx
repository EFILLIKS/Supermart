import { motion } from "framer-motion";
import { Home, Store, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTE = "M70 300 C110 300 118 240 170 232 S250 240 268 180 S330 110 392 128 S470 118 510 74";

/**
 * An original illustrated map. It is a schematic, not GPS: the courier's position shows the order's
 * status rather than a real location. Turn-by-turn directions open in the phone's maps app.
 */
export function MapView({ progress, className, label }: { progress: number; className?: string; label: string }) {
  const percent = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border bg-[#eef4ea]", className)} role="img" aria-label={label}>
      <svg viewBox="0 0 580 370" className="block size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="580" height="370" fill="#eef4ea" />
        <path d="M-10 60C60 30 120 70 150 40S240 0 260-10H-10Z" fill="#cfe8cf" />
        <path d="M420 370c20-50 70-70 170-70v70Z" fill="#cfe8cf" />
        <path d="M300 370C320 310 300 270 360 240S520 220 600 170v-30C520 180 400 180 340 220S270 300 270 370Z" fill="#bfe3ee" />
        <g stroke="#fff" strokeLinecap="round" fill="none">
          <path d="M-10 200H600M-10 110H600M90-10V380M220-10V380M450-10V380" strokeWidth="11" />
          <path d="M-10 300H300M-10 40 190 380M340-10 600 260" strokeWidth="7" />
        </g>
        <g fill="#dcdcd0">
          {[[108, 126, 90, 56], [238, 126, 70, 50], [108, 214, 44, 70], [240, 214, 40, 20], [470, 210, 90, 60], [470, 124, 60, 62], [20, 130, 50, 55], [20, 214, 50, 66], [340, 20, 90, 70], [110, 16, 90, 70]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="7" />)}
        </g>
        <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
        <path d={ROUTE} fill="none" stroke="#a7f3d0" strokeWidth="6" strokeLinecap="round" />
        <motion.path d={ROUTE} fill="none" stroke="#047857" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 1.4, ease: "easeInOut" }} />
      </svg>
      <Courier percent={percent} />
    </div>
  );
}

/** Scales the route's coordinates with the map by using an inner SVG for the moving marker. */
function Courier({ percent }: { percent: number }) {
  return (
    <svg viewBox="0 0 580 370" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <Pin x={70} y={300} tone="#0f3d2e" icon={Store} />
      <Pin x={510} y={74} tone="#e11d48" icon={Home} />
      <motion.g style={{ offsetPath: `path("${ROUTE}")`, offsetRotate: "0deg" }} initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: `${percent}%` }} transition={{ duration: 1.4, ease: "easeInOut" }}>
        <motion.circle r="20" fill="#047857" opacity=".22" animate={{ r: [14, 26, 14], opacity: [0.3, 0.05, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        <circle r="13" fill="#047857" stroke="#fff" strokeWidth="3" />
        <path d="M-7 3V-3h7l3 3h4v3h-2a2 2 0 0 1-4 0h-4a2 2 0 0 1-4 0Z" fill="#fff" />
      </motion.g>
    </svg>
  );
}

/** Sits in map coordinates, drops in with a bounce. */
function Pin({ x, y, tone, icon: Icon }: { x: number; y: number; tone: string; icon: LucideIcon }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g initial={{ y: -26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.25 }}>
        <circle r="17" fill={tone} stroke="#fff" strokeWidth="3" />
        <Icon x={-9} y={-9} width={18} height={18} color="#fff" aria-hidden />
      </motion.g>
    </g>
  );
}
