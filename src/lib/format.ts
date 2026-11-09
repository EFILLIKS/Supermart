import type { OrderStatus } from "@/types";

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Whole rupees stay clean, and anything else always shows paise: ₹334.20, never ₹334.2. */
export const formatMoney = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? whole : exact).format(n);
export const formatCompact = (n: number) => `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Placed", CONFIRMED: "Confirmed", PACKED: "Packed", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    let s = String(v);
    // Neutralise spreadsheet formula injection from names and notes.
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const isSameDay = (iso: string, d = new Date()) => new Date(iso).toDateString() === d.toDateString();
