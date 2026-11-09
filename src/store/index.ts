import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { COUPONS, CATEGORIES, PRODUCTS } from "@/data/catalog";
import { buildSeed, DEMO_IDS, SEED_CUSTOMERS, SEED_EMPLOYEES, SEED_SETTINGS } from "@/data/seed";
import * as backend from "@/lib/backend";
import { checkCoupon, computeTotals, deliveryFeeFor } from "@/lib/pricing";
import { isLive, supabase } from "@/lib/supabase";
import type { Address, Category, Coupon, Customer, Employee, ListItem, MovementReason, Order, OrderLine, OrderStatus, PaymentMethod, Product, Review, Role, Session, Settings, StockMovement } from "@/types";

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

export interface PlaceOrderInput {
  addressId: string;
  method: PaymentMethod;
  coupon?: string;
  slot: string;
  reference?: string;
}

export interface PosSaleInput {
  items: { productId: string; quantity: number }[];
  method: PaymentMethod;
  discountPercent: number;
  customerId?: string | null;
  reference?: string;
}

interface State {
  ready: boolean;
  loadError: string | null;
  session: Session | null;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  customers: Customer[];
  employees: Employee[];
  orders: Order[];
  reviews: Review[];
  movements: StockMovement[];
  settings: Settings;
  nextOrderNumber: number;
  cart: Record<string, number>;
  wishlist: string[];
  smartList: ListItem[];

  init(): Promise<void>;
  refresh(): Promise<void>;
  loginDemo(role: Role): void;
  logout(): Promise<void>;
  resetDemo(): void;

  addToCart(productId: string, quantity?: number): void;
  setCartQty(productId: string, quantity: number): void;
  clearCart(): void;
  toggleWishlist(productId: string): Promise<void>;
  addReview(productId: string, rating: number, body: string): Promise<void>;
  addAddress(address: Omit<Address, "id">): Promise<void>;
  setSmartList(items: ListItem[]): void;

  placeOrder(input: PlaceOrderInput): Promise<string>;
  cancelMyOrder(orderId: string): Promise<void>;
  createPosSale(input: PosSaleInput): Promise<string>;
  addWalkInCustomer(name: string, phone: string): Promise<void>;

  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  assignDriver(orderId: string, driverId: string): Promise<void>;
  pickUp(orderId: string): Promise<void>;
  confirmDelivery(orderId: string, code: string): Promise<boolean>;
  failDelivery(orderId: string, reason: string): Promise<void>;

  upsertProduct(product: Product): Promise<void>;
  adjustStock(productId: string, delta: number, reason: MovementReason, note?: string): Promise<void>;
  upsertCategory(category: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  upsertCoupon(coupon: Coupon): Promise<void>;
  deleteCoupon(id: string): Promise<void>;
  upsertEmployee(employee: Employee): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
}

const DEMO_SESSIONS: Record<Role, Session> = {
  CUSTOMER: { role: "CUSTOMER", userId: DEMO_IDS.customer, customerId: DEMO_IDS.customer, name: SEED_CUSTOMERS[0].name, email: SEED_CUSTOMERS[0].email },
  ADMIN: { role: "ADMIN", userId: DEMO_IDS.admin, name: "Nisha Verma", email: "nisha@supermart.example" },
  SALES: { role: "SALES", userId: DEMO_IDS.sales, name: "Rahul Pawar", email: "rahul@supermart.example" },
  DELIVERY: { role: "DELIVERY", userId: DEMO_IDS.driver, name: "Imran Qureshi", email: "imran@supermart.example" },
};

const freshData = () => {
  const seed = buildSeed();
  return {
    products: PRODUCTS, categories: CATEGORIES, coupons: COUPONS, customers: SEED_CUSTOMERS, employees: SEED_EMPLOYEES,
    orders: seed.orders, reviews: seed.reviews, movements: seed.movements, nextOrderNumber: seed.nextOrderNumber, settings: SEED_SETTINGS,
    cart: {} as Record<string, number>,
    wishlist: ["p-alphonso-mango", "p-sourdough-loaf", "p-dark-chocolate"],
    smartList: [] as ListItem[],
  };
};

const patchOrder = (orders: Order[], id: string, patch: (o: Order) => Order) => orders.map((o) => (o.id === id ? patch(o) : o));
const withEvent = (o: Order, status: OrderStatus): Order => ({ ...o, status, events: [...o.events, { status, at: nowIso() }] });
const newOtp = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Runs the server call in live mode then reloads; otherwise applies the local change. */
      async function run(remoteCall: () => Promise<unknown>, local: () => void) {
        if (isLive) {
          await remoteCall();
          await get().refresh();
        } else {
          local();
        }
      }

      const moveStock = (lines: { productId: string; quantity: number }[], direction: -1 | 1, orderNumber: string) => {
        const byId = new Map(lines.map((l) => [l.productId, l.quantity]));
        set((s) => ({
          products: s.products.map((p) => (byId.has(p.id) ? { ...p, stock: p.stock + direction * byId.get(p.id)! } : p)),
          movements: [
            ...lines.map((l): StockMovement => ({ id: uid("mv"), productId: l.productId, delta: direction * l.quantity, reason: direction < 0 ? "SALE" : "RETURN", note: orderNumber, at: nowIso() })),
            ...s.movements,
          ],
        }));
      };

      const assertInStock = (lines: { productId: string; quantity: number }[]) => {
        for (const line of lines) {
          const p = get().products.find((x) => x.id === line.productId);
          if (!p || !p.active) throw new Error("A product in this basket is no longer sold.");
          if (p.stock < line.quantity) throw new Error(`Only ${p.stock} left of ${p.name}.`);
        }
      };

      const toLines = (items: { productId: string; quantity: number }[]): OrderLine[] =>
        items.map(({ productId, quantity }) => {
          const p = get().products.find((x) => x.id === productId)!;
          return { productId, name: p.name, unit: p.unit, image: p.image, price: p.price, taxRate: p.taxRate, quantity };
        });

      return {
        ...freshData(),
        ready: false,
        loadError: null,
        session: null,

        async init() {
          if (!isLive) {
            set({ ready: true, loadError: null });
            return;
          }
          try {
            set({ session: await backend.currentSession(), loadError: null });
            await get().refresh();
            set({ ready: true });
            supabase!.auth.onAuthStateChange((event) => {
              if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
              // Supabase forbids awaiting its own client inside this callback.
              setTimeout(async () => {
                set({ session: await backend.currentSession() });
                await get().refresh();
              });
            });
          } catch (e) {
            set({ ready: true, loadError: (e as Error).message });
          }
        },

        async refresh() {
          if (!isLive) return;
          const d = await backend.loadAll(get().session);
          set({ ...d, settings: d.settings ?? get().settings });
        },

        loginDemo: (role) => set({ session: DEMO_SESSIONS[role] }),
        async logout() {
          if (isLive) await backend.signOut();
          set({ session: null });
        },
        resetDemo: () => set({ ...freshData() }),

        addToCart: (id, quantity = 1) => set((s) => {
          const stock = s.products.find((p) => p.id === id)?.stock ?? 0;
          return { cart: { ...s.cart, [id]: Math.min((s.cart[id] ?? 0) + quantity, stock) } };
        }),
        setCartQty: (id, quantity) => set((s) => {
          const cart = { ...s.cart };
          const stock = s.products.find((p) => p.id === id)?.stock ?? 0;
          if (quantity <= 0) delete cart[id];
          else cart[id] = Math.min(quantity, stock);
          return { cart };
        }),
        clearCart: () => set({ cart: {} }),

        async toggleWishlist(productId) {
          const had = get().wishlist.includes(productId);
          set((s) => ({ wishlist: had ? s.wishlist.filter((x) => x !== productId) : [...s.wishlist, productId] }));
          const customerId = get().session?.customerId;
          if (isLive && customerId) {
            try {
              await (had ? backend.remote.removeFromWishlist(customerId, productId) : backend.remote.addToWishlist(customerId, productId));
            } catch (e) {
              set((s) => ({ wishlist: had ? [...s.wishlist, productId] : s.wishlist.filter((x) => x !== productId) }));
              throw e;
            }
          }
        },

        async addReview(productId, rating, body) {
          const session = get().session;
          if (!session?.customerId) throw new Error("Sign in as a customer to leave a review.");
          await run(
            () => backend.remote.addReview(session.customerId!, productId, rating, body, session.name),
            () => set((s) => ({
              reviews: [
                { id: uid("rev"), productId, customerId: session.customerId!, author: session.name, rating, body, createdAt: nowIso() },
                ...s.reviews.filter((r) => !(r.productId === productId && r.customerId === session.customerId)),
              ],
            })),
          );
        },

        async addAddress(address) {
          const customerId = get().session?.customerId;
          if (!customerId) throw new Error("Sign in to save an address.");
          await run(
            () => backend.remote.addAddress(customerId, address),
            () => set((s) => ({ customers: s.customers.map((c) => (c.id === customerId ? { ...c, addresses: [...c.addresses, { ...address, id: uid("addr") }] } : c)) })),
          );
        },

        setSmartList: (smartList) => set({ smartList }),

        async placeOrder(input) {
          const s = get();
          const session = s.session;
          if (!session?.customerId) throw new Error("Sign in as a customer to place an order.");
          const items = Object.entries(s.cart).map(([productId, quantity]) => ({ productId, quantity }));
          if (!items.length) throw new Error("Your basket is empty.");

          if (isLive) {
            const id = await backend.remote.placeOrder({ items, addressId: input.addressId, method: input.method, coupon: input.coupon, slot: input.slot });
            set({ cart: {} });
            await get().refresh();
            return id;
          }

          assertInStock(items);
          const lines = toLines(items);
          const subtotal = computeTotals(lines, 0, 0).subtotal;
          let discount = 0;
          if (input.coupon) {
            const check = checkCoupon(input.coupon, s.coupons, subtotal);
            if (!check.ok) throw new Error(check.reason);
            discount = check.discount;
          }
          const totals = computeTotals(lines, discount, deliveryFeeFor(subtotal - discount, s.settings));
          const customer = s.customers.find((c) => c.id === session.customerId)!;
          const address = customer.addresses.find((a) => a.id === input.addressId);
          if (!address) throw new Error("Choose one of your saved addresses.");
          const number = `SM-${s.nextOrderNumber}`;
          const id = uid("ord");
          const order: Order = {
            id, number, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, address, channel: "ONLINE", status: "PLACED", lines, ...totals,
            couponCode: input.coupon?.trim().toUpperCase() || undefined, slot: input.slot,
            payment: { method: input.method, status: input.method === "COD" ? "PENDING" : "PAID", reference: input.reference },
            placedAt: nowIso(), events: [{ status: "PLACED", at: nowIso() }], otp: newOtp(),
          };
          moveStock(items, -1, number);
          set((st) => ({
            orders: [order, ...st.orders], cart: {}, nextOrderNumber: st.nextOrderNumber + 1,
            coupons: input.coupon ? st.coupons.map((c) => (c.code === order.couponCode ? { ...c, usedCount: c.usedCount + 1 } : c)) : st.coupons,
          }));
          return id;
        },

        async cancelMyOrder(orderId) {
          await run(() => backend.remote.cancelMine(orderId), () => {
            const o = get().orders.find((x) => x.id === orderId);
            if (!o || o.status !== "PLACED") throw new Error("This order is already being prepared.");
            moveStock(o.lines, 1, o.number);
            set((s) => ({ orders: patchOrder(s.orders, orderId, (x) => ({ ...withEvent(x, "CANCELLED"), otp: undefined, payment: { ...x.payment, status: x.payment.status === "PAID" ? "REFUNDED" : "FAILED" } })) }));
          });
        },

        async createPosSale(input) {
          if (input.discountPercent < 0 || input.discountPercent > 30) throw new Error("Discount must be between 0 and 30 percent.");
          if (!input.items.length) throw new Error("The bill is empty.");
          if (isLive) {
            const id = await backend.remote.posSale(input);
            await get().refresh();
            return id;
          }
          assertInStock(input.items);
          const s = get();
          const lines = toLines(input.items);
          const subtotal = computeTotals(lines, 0, 0).subtotal;
          const totals = computeTotals(lines, (subtotal * input.discountPercent) / 100, 0);
          const customer = s.customers.find((c) => c.id === input.customerId);
          const number = `SM-${s.nextOrderNumber}`;
          const id = uid("ord");
          const order: Order = {
            id, number, customerId: customer?.id ?? null, customerName: customer?.name ?? "Walk-in customer", customerPhone: customer?.phone ?? "", address: null, channel: "POS", status: "COMPLETED", lines, ...totals,
            payment: { method: input.method, status: "PAID", reference: input.reference }, placedAt: nowIso(), events: [{ status: "COMPLETED", at: nowIso() }], cashierId: s.session?.userId,
          };
          moveStock(input.items, -1, number);
          set((st) => ({
            orders: [order, ...st.orders], nextOrderNumber: st.nextOrderNumber + 1,
            customers: customer ? st.customers.map((c) => (c.id === customer.id ? { ...c, loyaltyPoints: c.loyaltyPoints + Math.floor(totals.total / 100) } : c)) : st.customers,
          }));
          return id;
        },

        async addWalkInCustomer(name, phone) {
          await run(() => backend.remote.addCustomer(name, phone), () => set((s) => ({
            customers: [{ id: uid("cust"), name, phone, email: "", loyaltyPoints: 0, joinedAt: nowIso(), addresses: [] }, ...s.customers],
          })));
        },

        async setOrderStatus(orderId, status) {
          await run(() => backend.remote.setStatus(orderId, status), () => {
            const o = get().orders.find((x) => x.id === orderId);
            if (!o) throw new Error("Order not found.");
            const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = { PLACED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PACKED", "CANCELLED"], PACKED: ["CANCELLED"] };
            if (!allowed[o.status]?.includes(status)) throw new Error(`An order cannot move from ${o.status} to ${status}.`);
            if (status === "CANCELLED") moveStock(o.lines, 1, o.number);
            set((s) => ({
              orders: patchOrder(s.orders, orderId, (x) => {
                const next = withEvent(x, status);
                if (status !== "CANCELLED") return next;
                return { ...next, otp: undefined, assignment: undefined, payment: { ...x.payment, status: x.payment.status === "PAID" ? "REFUNDED" : "FAILED" } };
              }),
            }));
          });
        },

        async assignDriver(orderId, driverId) {
          await run(() => backend.remote.assignDriver(orderId, driverId), () => {
            const driver = get().employees.find((e) => e.id === driverId && e.role === "DELIVERY" && e.active);
            if (!driver) throw new Error("That person is not an active delivery partner.");
            set((s) => ({ orders: patchOrder(s.orders, orderId, (o) => ({ ...o, assignment: { driverId, driverName: driver.name, status: "ASSIGNED", earning: s.settings.driverPayout, assignedAt: nowIso() } })) }));
          });
        },

        async pickUp(orderId) {
          await run(() => backend.remote.pickUp(orderId), () => {
            const o = get().orders.find((x) => x.id === orderId);
            if (o?.status !== "PACKED") throw new Error("The store has not packed this order yet.");
            set((s) => ({ orders: patchOrder(s.orders, orderId, (x) => ({ ...withEvent(x, "OUT_FOR_DELIVERY"), assignment: { ...x.assignment!, status: "PICKED_UP", pickedUpAt: nowIso() } })) }));
          });
        },

        async confirmDelivery(orderId, code) {
          if (isLive) {
            const ok = await backend.remote.confirm(orderId, code);
            if (ok) await get().refresh();
            return ok;
          }
          const o = get().orders.find((x) => x.id === orderId);
          if (!o || o.otp !== code.trim()) return false;
          set((s) => ({
            orders: patchOrder(s.orders, orderId, (x) => ({
              ...withEvent(x, "DELIVERED"), otp: undefined,
              assignment: { ...x.assignment!, status: "DELIVERED", deliveredAt: nowIso() },
              payment: x.payment.method === "COD" ? { ...x.payment, status: "PAID" } : x.payment,
            })),
          }));
          return true;
        },

        async failDelivery(orderId, reason) {
          await run(() => backend.remote.failDelivery(orderId, reason), () => set((s) => ({
            orders: patchOrder(s.orders, orderId, (x) => ({ ...withEvent(x, "PACKED"), assignment: { ...x.assignment!, status: "FAILED", failureReason: reason } })),
          })));
        },

        async upsertProduct(product) {
          await run(() => backend.remote.upsertProduct(product), () => set((s) => ({
            products: s.products.some((p) => p.id === product.id) ? s.products.map((p) => (p.id === product.id ? product : p)) : [product, ...s.products],
          })));
        },

        async adjustStock(productId, delta, reason, note) {
          await run(() => backend.remote.adjustStock(productId, delta, reason, note), () => {
            const p = get().products.find((x) => x.id === productId);
            if (!p) throw new Error("Product not found.");
            if (p.stock + delta < 0) throw new Error(`Only ${p.stock} in stock, so you cannot remove ${-delta}.`);
            set((s) => ({
              products: s.products.map((x) => (x.id === productId ? { ...x, stock: x.stock + delta } : x)),
              movements: [{ id: uid("mv"), productId, delta, reason, note, at: nowIso() }, ...s.movements],
            }));
          });
        },

        async upsertCategory(category) {
          await run(() => backend.remote.upsertCategory(category), () => set((s) => ({
            categories: s.categories.some((c) => c.id === category.id) ? s.categories.map((c) => (c.id === category.id ? category : c)) : [...s.categories, category],
          })));
        },
        async deleteCategory(id) {
          if (get().products.some((p) => p.categoryId === id)) throw new Error("Move this category's products first.");
          await run(() => backend.remote.deleteCategory(id), () => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })));
        },
        async upsertCoupon(coupon) {
          await run(() => backend.remote.upsertCoupon(coupon), () => set((s) => ({
            coupons: s.coupons.some((c) => c.id === coupon.id) ? s.coupons.map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...s.coupons],
          })));
        },
        async deleteCoupon(id) {
          await run(() => backend.remote.deleteCoupon(id), () => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })));
        },
        async upsertEmployee(employee) {
          await run(() => backend.remote.updateEmployee(employee), () => set((s) => ({
            employees: s.employees.some((e) => e.id === employee.id) ? s.employees.map((e) => (e.id === employee.id ? employee : e)) : [employee, ...s.employees],
          })));
        },
        async saveSettings(settings) {
          await run(() => backend.remote.saveSettings(settings), () => set({ settings }));
        },
      };
    },
    {
      name: "supermart-demo-v1",
      storage: createJSONStorage(() => localStorage),
      // Live mode keeps only the personal basket and list locally; Supabase owns everything else.
      partialize: (s) => {
        const { ready: _r, loadError: _l, ...rest } = s;
        void _r; void _l;
        return (isLive ? { cart: s.cart, smartList: s.smartList } : rest) as Partial<State>;
      },
    },
  ),
);

/** Keeps two open tabs in step, so that an order placed in one appears in another portal's tab. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "supermart-demo-v1") void useStore.persist.rehydrate();
  });
}

export const selectCartCount = (s: State) => Object.values(s.cart).reduce((a, b) => a + b, 0);
export type { Customer };
