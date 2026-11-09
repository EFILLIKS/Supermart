import type { Address, Category, Coupon, Customer, Employee, MovementReason, Order, OrderStatus, PaymentMethod, Product, Review, Role, Session, Settings, StockMovement } from "@/types";
import { supabase } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

async function rpc<T = unknown>(name: string, args: Record<string, unknown>) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

const toAddress = (a: Row | null): Address | null =>
  a && { id: a.id, label: a.label, line1: a.line1, line2: a.line2 ?? undefined, city: a.city, state: a.state, postalCode: a.postal_code, isDefault: a.is_default };

export interface RemoteData {
  categories: Category[];
  products: Product[];
  reviews: Review[];
  settings: Settings | null;
  coupons: Coupon[];
  customers: Customer[];
  orders: Order[];
  employees: Employee[];
  movements: StockMovement[];
  wishlist: string[];
}

/** Loads everything the signed-in role may see. Row level security decides what comes back. */
export async function loadAll(session: Session | null): Promise<RemoteData> {
  const c = db();
  const [cats, prods, inv, revs, cfg] = await Promise.all([
    rows(c.from("categories").select("*").order("sort_order")),
    rows(c.from("products").select("*").order("name")),
    rows(c.from("inventory").select("*")),
    rows(c.from("reviews").select("*").order("created_at", { ascending: false })),
    rows(c.from("store_settings").select("*").limit(1)),
  ]);
  const stock = new Map(inv.map((i) => [i.product_id, i]));
  const empty: RemoteData = {
    categories: cats.map((x) => ({ id: x.id, slug: x.slug, name: x.name, description: x.description, image: x.image_url ?? `/images/categories/${x.slug}.svg`, active: x.is_active })),
    products: prods.map((p) => ({
      id: p.id, slug: p.slug, categoryId: p.category_id, barcode: p.barcode, name: p.name, brand: p.brand, description: p.description, unit: p.unit,
      price: Number(p.price), mrp: Number(p.mrp), taxRate: Number(p.tax_rate), image: p.image_url ?? `/images/products/${p.slug}.svg`, origin: p.origin ?? "", tags: p.tags ?? [], active: p.is_active,
      stock: stock.get(p.id)?.quantity ?? 0, reorderLevel: stock.get(p.id)?.reorder_level ?? 10,
    })),
    reviews: revs.map((r) => ({ id: r.id, productId: r.product_id, customerId: r.customer_id, author: r.author_name, rating: r.rating, body: r.body, createdAt: r.created_at })),
    settings: cfg[0] ? { storeName: cfg[0].store_name, supportPhone: cfg[0].support_phone, freeDeliveryOver: Number(cfg[0].free_delivery_over), deliveryFee: Number(cfg[0].delivery_fee), driverPayout: Number(cfg[0].driver_payout) } : null,
    coupons: [], customers: [], orders: [], employees: [], movements: [], wishlist: [],
  };
  if (!session) return empty;

  const [coupons, customers, addresses, orders, items, events, payments, assignments, otps, wishlist] = await Promise.all([
    rows(c.from("coupons").select("*").order("code")),
    rows(c.from("customers").select("*").order("full_name")),
    rows(c.from("addresses").select("*")),
    rows(c.from("orders").select("*").order("placed_at", { ascending: false }).limit(1000)),
    rows(c.from("order_items").select("*")),
    rows(c.from("order_events").select("*").order("at")),
    rows(c.from("payments").select("*")),
    rows(c.from("delivery_assignments").select("*")),
    rows(c.from("delivery_otps").select("*")),
    rows(c.from("wishlists").select("product_id")),
  ]);

  let employees: Employee[] = [];
  let movements: StockMovement[] = [];
  const driverNames = new Map<string, string>();
  if (session.role === "ADMIN") {
    const [users, staff, moves] = await Promise.all([
      rows(c.from("users").select("*").neq("role", "CUSTOMER").order("full_name")),
      rows(c.from("employees").select("*")),
      rows(c.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(500)),
    ]);
    const hr = new Map(staff.map((s) => [s.user_id, s]));
    employees = users.map((u) => ({
      id: u.id, name: u.full_name || u.email, email: u.email, phone: u.phone ?? "", role: u.role as Role, active: u.is_active,
      code: hr.get(u.id)?.employee_code ?? "-", department: hr.get(u.id)?.department ?? "-", shift: hr.get(u.id)?.shift ?? "-", hiredOn: hr.get(u.id)?.hired_on ?? u.created_at,
    }));
    users.forEach((u) => driverNames.set(u.id, u.full_name || u.email));
    movements = moves.map((m) => ({ id: String(m.id), productId: m.product_id, delta: m.delta, reason: m.reason, note: m.note ?? undefined, at: m.created_at }));
  }

  const group = <T extends Row>(list: T[]) => {
    const map = new Map<string, T[]>();
    list.forEach((x) => map.set(x.order_id, [...(map.get(x.order_id) ?? []), x]));
    return map;
  };
  const itemsBy = group(items);
  const eventsBy = group(events);
  const paymentBy = new Map(payments.map((p) => [p.order_id, p]));
  const assignBy = new Map(assignments.map((a) => [a.order_id, a]));
  const otpBy = new Map(otps.map((o) => [o.order_id, o.code]));
  const couponBy = new Map(coupons.map((x) => [x.id, x.code]));

  return {
    ...empty,
    coupons: coupons.map((x) => ({
      id: x.id, code: x.code, description: x.description, kind: x.kind, value: Number(x.value), minOrder: Number(x.min_order),
      maxDiscount: x.max_discount == null ? undefined : Number(x.max_discount), usageLimit: x.usage_limit ?? undefined, usedCount: x.used_count, endsAt: x.ends_at ?? undefined, active: x.is_active,
    })),
    customers: customers.map((x) => ({
      id: x.id, name: x.full_name, phone: x.phone ?? "", email: x.email ?? "", loyaltyPoints: x.loyalty_points, joinedAt: x.created_at,
      addresses: addresses.filter((a) => a.customer_id === x.id).map((a) => toAddress(a)!),
    })),
    orders: orders.map((o) => {
      const pay = paymentBy.get(o.id);
      const a = assignBy.get(o.id);
      return {
        id: o.id, number: o.order_number, customerId: o.customer_id, customerName: o.customer_name, customerPhone: o.customer_phone ?? "", address: toAddress(o.address_snapshot),
        channel: o.channel, status: o.status as OrderStatus, subtotal: Number(o.subtotal), discount: Number(o.discount), tax: Number(o.tax), deliveryFee: Number(o.delivery_fee), total: Number(o.total),
        couponCode: couponBy.get(o.coupon_id), slot: o.slot ?? undefined, placedAt: o.placed_at, cashierId: o.created_by ?? undefined,
        lines: (itemsBy.get(o.id) ?? []).map((l) => ({ productId: l.product_id ?? "", name: l.name, unit: l.unit, image: l.image_url ?? "", price: Number(l.unit_price), taxRate: Number(l.tax_rate), quantity: l.quantity })),
        events: (eventsBy.get(o.id) ?? []).map((e) => ({ status: e.status, at: e.at })),
        payment: { method: (pay?.method ?? "COD") as PaymentMethod, status: pay?.status ?? "PENDING", reference: pay?.reference ?? undefined },
        assignment: a && { driverId: a.driver_id, driverName: driverNames.get(a.driver_id) ?? "Delivery partner", status: a.status, earning: Number(a.earning), assignedAt: a.assigned_at, pickedUpAt: a.picked_up_at ?? undefined, deliveredAt: a.delivered_at ?? undefined, failureReason: a.failure_reason ?? undefined },
        otp: otpBy.get(o.id),
      } satisfies Order;
    }),
    employees,
    movements,
    wishlist: wishlist.map((w) => w.product_id),
  };
}

export async function currentSession(): Promise<Session | null> {
  const c = db();
  const { data } = await c.auth.getUser();
  if (!data.user) return null;
  const [me] = await rows(c.from("users").select("*").eq("id", data.user.id));
  if (!me || !me.is_active) return null;
  const [customer] = await rows(c.from("customers").select("id").eq("user_id", data.user.id));
  return { role: me.role, userId: me.id, customerId: customer?.id, name: me.full_name || me.email, email: me.email };
}

export async function signIn(email: string, password: string) {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}
export async function signUp(email: string, password: string, fullName: string) {
  const { error } = await db().auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) throw new Error(error.message);
}
export async function signOut() {
  await db().auth.signOut();
}

const toRpcItems = (items: { productId: string; quantity: number }[]) => items.map((i) => ({ product_id: i.productId, quantity: i.quantity }));

export const remote = {
  placeOrder: (i: { items: { productId: string; quantity: number }[]; addressId: string; method: PaymentMethod; coupon?: string; slot: string }) =>
    rpc<string>("place_order", { p_items: toRpcItems(i.items), p_address_id: i.addressId, p_method: i.method, p_coupon_code: i.coupon ?? null, p_slot: i.slot }),
  posSale: (i: { items: { productId: string; quantity: number }[]; method: PaymentMethod; discountPercent: number; customerId?: string | null; reference?: string }) =>
    rpc<string>("create_pos_sale", { p_items: toRpcItems(i.items), p_method: i.method, p_discount_percent: i.discountPercent, p_customer_id: i.customerId ?? null, p_reference: i.reference ?? null }),
  setStatus: (id: string, status: OrderStatus) => rpc("update_order_status", { p_order: id, p_status: status }),
  cancelMine: (id: string) => rpc("cancel_my_order", { p_order: id }),
  assignDriver: (id: string, driver: string) => rpc("assign_driver", { p_order: id, p_driver: driver }),
  pickUp: (id: string) => rpc("driver_pick_up", { p_order: id }),
  confirm: (id: string, code: string) => rpc<boolean>("confirm_delivery", { p_order: id, p_code: code }),
  failDelivery: (id: string, reason: string) => rpc("fail_delivery", { p_order: id, p_reason: reason }),
  adjustStock: (id: string, delta: number, reason: MovementReason, note?: string) => rpc("adjust_stock", { p_product: id, p_delta: delta, p_reason: reason, p_note: note ?? null }),

  async upsertProduct(p: Product) {
    const isNew = !/^[0-9a-f-]{36}$/.test(p.id);
    const row = { category_id: p.categoryId, slug: p.slug, barcode: p.barcode, name: p.name, brand: p.brand, description: p.description, unit: p.unit, price: p.price, mrp: p.mrp, tax_rate: p.taxRate, image_url: p.image, origin: p.origin, tags: p.tags, is_active: p.active };
    if (isNew) {
      const [made] = await rows(db().from("products").insert(row).select("id"));
      await rows(db().from("inventory").insert({ product_id: made.id, quantity: 0, reorder_level: p.reorderLevel }).select("product_id"));
    } else {
      await rows(db().from("products").update(row).eq("id", p.id).select("id"));
      await rows(db().from("inventory").update({ reorder_level: p.reorderLevel }).eq("product_id", p.id).select("product_id"));
    }
  },
  async upsertCategory(x: Category) {
    const row = { slug: x.slug, name: x.name, description: x.description, image_url: x.image, is_active: x.active };
    if (/^[0-9a-f-]{36}$/.test(x.id)) await rows(db().from("categories").update(row).eq("id", x.id).select("id"));
    else await rows(db().from("categories").insert(row).select("id"));
  },
  deleteCategory: (id: string) => rows(db().from("categories").delete().eq("id", id).select("id")),
  async upsertCoupon(x: Coupon) {
    const row = { code: x.code, description: x.description, kind: x.kind, value: x.value, min_order: x.minOrder, max_discount: x.maxDiscount ?? null, usage_limit: x.usageLimit ?? null, ends_at: x.endsAt ?? null, is_active: x.active };
    if (/^[0-9a-f-]{36}$/.test(x.id)) await rows(db().from("coupons").update(row).eq("id", x.id).select("id"));
    else await rows(db().from("coupons").insert(row).select("id"));
  },
  deleteCoupon: (id: string) => rows(db().from("coupons").delete().eq("id", id).select("id")),
  updateEmployee: (e: Employee) => rows(db().from("users").update({ role: e.role, is_active: e.active, full_name: e.name, phone: e.phone }).eq("id", e.id).select("id")),
  saveSettings: (s: Settings) => rows(db().from("store_settings").update({ store_name: s.storeName, support_phone: s.supportPhone, free_delivery_over: s.freeDeliveryOver, delivery_fee: s.deliveryFee, driver_payout: s.driverPayout }).eq("id", true).select("id")),
  addToWishlist: (customerId: string, productId: string) => rows(db().from("wishlists").upsert({ customer_id: customerId, product_id: productId }).select("product_id")),
  removeFromWishlist: (customerId: string, productId: string) => rows(db().from("wishlists").delete().eq("customer_id", customerId).eq("product_id", productId).select("product_id")),
  addReview: (customerId: string, productId: string, rating: number, body: string, author: string) =>
    rows(db().from("reviews").upsert({ customer_id: customerId, product_id: productId, rating, body, author_name: author }, { onConflict: "product_id,customer_id" }).select("id")),
  addAddress: (customerId: string, a: Omit<Address, "id">) =>
    rows(db().from("addresses").insert({ customer_id: customerId, label: a.label, line1: a.line1, line2: a.line2 ?? null, city: a.city, state: a.state, postal_code: a.postalCode }).select("id")),
  addCustomer: (name: string, phone: string) => rows(db().from("customers").insert({ full_name: name, phone }).select("id")),
};
