import { requireRole } from "@/lib/require-role";
import { PanelShell } from "@/components/panel-shell";
import { ActionGrid, MetricsGrid, OperationsTable } from "@/components/dashboard-blocks";

export const metadata = { title: "Grocery Panel" };

export default async function GroceryPage() {
  const session = await requireRole(["GROCERY"]);

  return (
    <PanelShell role="GROCERY" email={session.email}>
      <MetricsGrid
        metrics={[
          { label: "Orders to pack", value: "12", detail: "3 priority orders" },
          { label: "Today’s sales", value: "₹10,560", detail: "+16.1% from yesterday" },
          { label: "Low stock items", value: "18", detail: "Action recommended" },
          { label: "Inventory accuracy", value: "98.2%", detail: "Last stock audit" }
        ]}
      />
      <div className="panel-two-column">
        <OperationsTable
          title="Packing queue"
          rows={[
            { id: "#QC1047", customer: "S. Nath", source: "12 items", amount: "₹624", status: "Packing" },
            { id: "#QC1044", customer: "N. Deb", source: "8 items", amount: "₹449", status: "Accepted" },
            { id: "#QC1040", customer: "T. Paul", source: "5 items", amount: "₹318", status: "Ready" }
          ]}
        />
        <ActionGrid
          title="Store tools"
          actions={[
            { title: "Add inventory", detail: "Products and variants" },
            { title: "Update stock", detail: "Quantity and expiry" },
            { title: "Price update", detail: "MRP, sale and discount" },
            { title: "Store availability", detail: "Open or temporarily closed" }
          ]}
        />
      </div>
    </PanelShell>
  );
}
