export type Role = "ADMIN" | "SALES" | "DELIVERY" | "CUSTOMER";
export type OrderStatus = "PLACED" | "CONFIRMED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COMPLETED" | "CANCELLED";
export type Channel = "ONLINE" | "POS";
export type PaymentMethod = "UPI" | "CARD" | "COD" | "CASH" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type AssignmentStatus = "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "FAILED";
export type MovementReason = "SALE" | "RESTOCK" | "RETURN" | "DAMAGE" | "ADJUSTMENT";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  categoryId: string;
  barcode: string;
  name: string;
  brand: string;
  description: string;
  unit: string;
  price: number;
  mrp: number;
  taxRate: number;
  image: string;
  origin: string;
  tags: string[];
  active: boolean;
  stock: number;
  reorderLevel: number;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  joinedAt: string;
  addresses: Address[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  code: string;
  department: string;
  shift: string;
  active: boolean;
  hiredOn: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  unit: string;
  image: string;
  price: number;
  taxRate: number;
  quantity: number;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
}

export interface Assignment {
  driverId: string;
  driverName: string;
  status: AssignmentStatus;
  earning: number;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  address: Address | null;
  channel: Channel;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  slot?: string;
  payment: { method: PaymentMethod; status: PaymentStatus; reference?: string };
  placedAt: string;
  events: OrderEvent[];
  assignment?: Assignment;
  /** Only present for the customer who owns the order. Never shown to drivers. */
  otp?: string;
  cashierId?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  kind: "PERCENT" | "FLAT";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  endsAt?: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  delta: number;
  reason: MovementReason;
  note?: string;
  at: string;
}

export interface Settings {
  storeName: string;
  supportPhone: string;
  freeDeliveryOver: number;
  deliveryFee: number;
  driverPayout: number;
}

export interface ListItem {
  id: string;
  text: string;
  quantity: number;
  done: boolean;
  productId?: string;
}

export interface Session {
  role: Role;
  userId: string;
  customerId?: string;
  name: string;
  email: string;
}
