import { requireRole } from "@/lib/require-role";
import { PanelShell } from "@/components/panel-shell";
import { ActionGrid, MetricsGrid, OperationsTable } from "@/components/dashboard-blocks";

export const metadata = { title: "Super Admin" };

export default async function AdminPage() {
  const session = await requireRole(["SUPER_ADMIN"]);

  return (
    <PanelShell role="SUPER_ADMIN" email={session.email}>
      <MetricsGrid
        metrics={[
          { label: "Today’s sales", value: "₹18,420", detail: "+12.8% from yesterday" },
          { label: "Active orders", value: "26", detail: "8 awaiting assignment" },
          { label: "Partner stores", value: "14", detail: "12 currently online" },
          { label: "Delivery success", value: "96.4%", detail: "Last 7 days" }
        ]}
      />
      <div className="panel-two-column">
        <OperationsTable
          title="Recent orders"
          rows={[
            { id: "#QC1048", customer: "A. Das", source: "Royal Kitchen", amount: "₹389", status: "Preparing" },
            { id: "#QC1047", customer: "S. Nath", source: "Quick Mart", amount: "₹624", status: "Packing" },
            { id: "#QC1046", customer: "P. Roy", source: "Home City Momos", amount: "₹198", status: "Out for delivery" },
            { id: "#QC1045", customer: "R. Paul", source: "Daily Needs", amount: "₹451", status: "Delivered" }
          ]}
        />
        <ActionGrid
          title="Management"
          actions={[
            { title: "Create partner", detail: "Restaurant, grocery or rider" },
            { title: "Add product", detail: "Catalog and inventory" },
            { title: "Create coupon", detail: "Limits and validity" },
            { title: "Assign rider", detail: "Active delivery orders" }
          ]}
        />
      </div>
    </PanelShell>
  );
}
