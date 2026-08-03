import { requireRole } from "@/lib/require-role";
import { PanelShell } from "@/components/panel-shell";
import { ActionGrid, MetricsGrid, OperationsTable } from "@/components/dashboard-blocks";

export const metadata = { title: "Restaurant Panel" };

export default async function RestaurantPage() {
  const session = await requireRole(["RESTAURANT"]);

  return (
    <PanelShell role="RESTAURANT" email={session.email}>
      <MetricsGrid
        metrics={[
          { label: "Today’s orders", value: "34", detail: "5 new orders" },
          { label: "Today’s sales", value: "₹7,860", detail: "+9.4% from yesterday" },
          { label: "Average prep time", value: "21 min", detail: "Target under 25 min" },
          { label: "Menu availability", value: "92%", detail: "4 items unavailable" }
        ]}
      />
      <div className="panel-two-column">
        <OperationsTable
          title="Kitchen queue"
          rows={[
            { id: "#QC1048", customer: "A. Das", source: "2 × Biryani", amount: "₹389", status: "Preparing" },
            { id: "#QC1043", customer: "M. Ali", source: "Fried rice + Momos", amount: "₹298", status: "Accepted" },
            { id: "#QC1039", customer: "K. Nath", source: "Pizza combo", amount: "₹419", status: "Ready" }
          ]}
        />
        <ActionGrid
          title="Restaurant tools"
          actions={[
            { title: "New menu item", detail: "Photo, price and variants" },
            { title: "Stock control", detail: "Available or sold out" },
            { title: "Store timing", detail: "Open, close and schedule" },
            { title: "Download report", detail: "Daily sales summary" }
          ]}
        />
      </div>
    </PanelShell>
  );
}
