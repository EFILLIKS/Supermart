import { History, LayoutDashboard, PackageSearch } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { useStore } from "@/store";

export default function DeliveryLayout() {
  const orders = useStore((s) => s.orders);
  const me = useStore((s) => s.session?.userId);
  const active = orders.filter((o) => o.assignment?.driverId === me && (o.assignment?.status === "ASSIGNED" || o.assignment?.status === "PICKED_UP")).length;
  return (
    <PortalShell
      portal="Delivery"
      nav={[
        { to: "/delivery", label: "Today", icon: LayoutDashboard, end: true },
        { to: "/delivery/orders", label: "Assigned orders", icon: PackageSearch, badge: active },
        { to: "/delivery/history", label: "History and earnings", icon: History },
      ]}
    />
  );
}
