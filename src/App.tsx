import { MotionConfig } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { RouteBoundary } from "@/components/RouteBoundary";
import { ErrorState, PageSkeleton } from "@/components/shared";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/store";
import type { Role } from "@/types";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const ShopLayout = lazy(() => import("@/pages/shop/ShopLayout"));
const Home = lazy(() => import("@/pages/shop/Home"));
const Catalog = lazy(() => import("@/pages/shop/Catalog"));
const ProductDetail = lazy(() => import("@/pages/shop/ProductDetail"));
const Wishlist = lazy(() => import("@/pages/shop/Wishlist"));
const Cart = lazy(() => import("@/pages/shop/Cart"));
const Checkout = lazy(() => import("@/pages/shop/Checkout"));
const Orders = lazy(() => import("@/pages/shop/Orders"));
const OrderDetail = lazy(() => import("@/pages/shop/OrderDetail"));
const SmartList = lazy(() => import("@/pages/shop/SmartList"));
const AssistantPage = lazy(() => import("@/pages/shop/AssistantPage"));
const Account = lazy(() => import("@/pages/shop/Account"));

const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/Overview"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminCategories = lazy(() => import("@/pages/admin/Categories"));
const AdminInventory = lazy(() => import("@/pages/admin/Inventory"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminEmployees = lazy(() => import("@/pages/admin/Employees"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminDelivery = lazy(() => import("@/pages/admin/Delivery"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminAi = lazy(() => import("@/pages/admin/AiInsights"));

const SalesLayout = lazy(() => import("@/pages/sales/SalesLayout"));
const Pos = lazy(() => import("@/pages/sales/Pos"));
const SalesInvoices = lazy(() => import("@/pages/sales/Invoices"));
const SalesCustomers = lazy(() => import("@/pages/sales/Customers"));
const SalesReports = lazy(() => import("@/pages/sales/Reports"));

const DeliveryLayout = lazy(() => import("@/pages/delivery/DeliveryLayout"));
const DeliveryDashboard = lazy(() => import("@/pages/delivery/Dashboard"));
const DeliveryAssigned = lazy(() => import("@/pages/delivery/Assigned"));
const DeliveryDetail = lazy(() => import("@/pages/delivery/Detail"));
const DeliveryHistory = lazy(() => import("@/pages/delivery/History"));

/** A convenience for navigation. The real access control is row level security on the server. */
function RequireRole({ allow }: { allow: Role[] }) {
  const session = useStore((s) => s.session);
  const location = useLocation();
  if (!session || !allow.includes(session.role)) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}&role=${allow[0]}`} replace />;
  }
  return <Outlet />;
}

export default function App() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const loadError = useStore((s) => s.loadError);

  useEffect(() => { void init(); }, [init]);

  if (!ready) return <PageSkeleton />;
  if (loadError) {
    return <div className="mx-auto max-w-xl p-8"><ErrorState title="Could not reach the store" body={loadError} onRetry={() => void init()} /></div>;
  }

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <BrowserRouter>
          <RouteBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route index element={<Landing />} />
                <Route path="login" element={<Login />} />

                <Route path="shop" element={<ShopLayout />}>
                  <Route index element={<Home />} />
                  <Route path="products" element={<Catalog />} />
                  <Route path="products/:slug" element={<ProductDetail />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="assistant" element={<AssistantPage />} />
                  <Route path="list" element={<SmartList />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route element={<RequireRole allow={["CUSTOMER"]} />}>
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="account" element={<Account />} />
                  </Route>
                </Route>

                <Route element={<RequireRole allow={["ADMIN"]} />}>
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<AdminOverview />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="ai" element={<AdminAi />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="inventory" element={<AdminInventory />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="employees" element={<AdminEmployees />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="delivery" element={<AdminDelivery />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                </Route>

                <Route element={<RequireRole allow={["SALES", "ADMIN"]} />}>
                  <Route path="sales" element={<SalesLayout />}>
                    <Route index element={<Pos />} />
                    <Route path="invoices" element={<SalesInvoices />} />
                    <Route path="customers" element={<SalesCustomers />} />
                    <Route path="reports" element={<SalesReports />} />
                  </Route>
                </Route>

                <Route element={<RequireRole allow={["DELIVERY"]} />}>
                  <Route path="delivery" element={<DeliveryLayout />}>
                    <Route index element={<DeliveryDashboard />} />
                    <Route path="orders" element={<DeliveryAssigned />} />
                    <Route path="orders/:id" element={<DeliveryDetail />} />
                    <Route path="history" element={<DeliveryHistory />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteBoundary>
        </BrowserRouter>
        <Toaster position="bottom-center" richColors closeButton />
      </TooltipProvider>
    </MotionConfig>
  );
}
