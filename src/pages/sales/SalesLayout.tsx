import { FileBarChart, ReceiptText, ScanBarcode, Users } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";

export default function SalesLayout() {
  return (
    <PortalShell
      portal="Sales"
      nav={[
        { to: "/sales", label: "Billing counter", icon: ScanBarcode, end: true },
        { to: "/sales/invoices", label: "Invoices", icon: ReceiptText },
        { to: "/sales/customers", label: "Customer lookup", icon: Users },
        { to: "/sales/reports", label: "Daily report", icon: FileBarChart },
      ]}
    />
  );
}
