import { BadgePercent, Boxes, ChartNoAxesCombined, ClipboardList, FileBarChart, FolderTree, LayoutDashboard, Package, Settings, Sparkles, Truck, UserCog, Users } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { useStore } from "@/store";

export default function AdminLayout() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const awaiting = orders.filter((o) => o.status === "PLACED").length;
  const low = products.filter((p) => p.active && p.stock <= p.reorderLevel).length;
  return (
    <PortalShell
      portal="Admin"
      nav={[
        { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombined },
        { to: "/admin/ai", label: "Forecasts and insights", icon: Sparkles },
        { to: "/admin/orders", label: "Orders", icon: ClipboardList, badge: awaiting },
        { to: "/admin/delivery", label: "Delivery", icon: Truck },
        { to: "/admin/products", label: "Products", icon: Package },
        { to: "/admin/categories", label: "Categories", icon: FolderTree },
        { to: "/admin/inventory", label: "Inventory", icon: Boxes, badge: low },
        { to: "/admin/customers", label: "Customers", icon: Users },
        { to: "/admin/employees", label: "Employees and roles", icon: UserCog },
        { to: "/admin/coupons", label: "Coupons", icon: BadgePercent },
        { to: "/admin/reports", label: "Reports", icon: FileBarChart },
        { to: "/admin/settings", label: "Settings", icon: Settings },
      ]}
    />
  );
}
