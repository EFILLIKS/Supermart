import type { Coupon, Settings } from "../types.ts";

export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PricedLine {
  price: number;
  quantity: number;
  taxRate: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

/** Prices include GST. Tax is the GST share of each line after discount is spread pro rata. */
export function computeTotals(lines: PricedLine[], discount: number, deliveryFee: number): Totals {
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const safeDiscount = roundMoney(Math.min(discount, subtotal));
  const ratio = subtotal > 0 ? 1 - safeDiscount / subtotal : 0;
  const tax = roundMoney(lines.reduce((sum, l) => sum + (l.price * l.quantity * ratio * l.taxRate) / (100 + l.taxRate), 0));
  return { subtotal, discount: safeDiscount, tax, deliveryFee, total: roundMoney(subtotal - safeDiscount + deliveryFee) };
}

export function deliveryFeeFor(afterDiscount: number, settings: Pick<Settings, "freeDeliveryOver" | "deliveryFee">) {
  return afterDiscount >= settings.freeDeliveryOver || afterDiscount === 0 ? 0 : settings.deliveryFee;
}

export type CouponCheck = { ok: true; coupon: Coupon; discount: number } | { ok: false; reason: string };

export function checkCoupon(code: string, coupons: Coupon[], subtotal: number, now = Date.now()): CouponCheck {
  const coupon = coupons.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon || !coupon.active) return { ok: false, reason: "This coupon is not valid." };
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return { ok: false, reason: "This coupon has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "This coupon has been fully redeemed." };
  if (subtotal < coupon.minOrder) return { ok: false, reason: `Add ₹${roundMoney(coupon.minOrder - subtotal)} more to use this coupon.` };
  const raw = coupon.kind === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  return { ok: true, coupon, discount: roundMoney(Math.min(raw, coupon.maxDiscount ?? raw, subtotal)) };
}
