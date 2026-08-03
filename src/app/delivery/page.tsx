import { requireRole } from "@/lib/require-role";
import { PanelShell } from "@/components/panel-shell";
import { ActionGrid, MetricsGrid, OperationsTable } from "@/components/dashboard-blocks";

export const metadata = { title: "Delivery Panel" };

export default async function DeliveryPage() {
  const session = await requireRole(["DELIVERY"]);

  return (
    <PanelShell role="DELIVERY" email={session.email}>
      <MetricsGrid
        metrics={[
          { label: "Today’s earning", value: "₹340", detail: "17 completed deliveries" },
          { label: "COD held", value: "₹1,240", detail: "Settlement due today" },
          { label: "Active order", value: "1", detail: "Pickup ready" },
          { label: "Acceptance rate", value: "94%", detail: "Last 30 deliveries" }
        ]}
      />
      <div className="panel-two-column">
        <OperationsTable
          title="Available deliveries"
          rows={[
            { id: "#QC1048", customer: "A. Das", source: "Royal Kitchen → Lala Road", amount: "₹20", status: "Ready" },
            { id: "#QC1047", customer: "S. Nath", source: "Quick Mart → Kalacheera", amount: "₹30", status: "Packing" }
          ]}
        />
        <ActionGrid
          title="Rider tools"
          actions={[
            { title: "Accept delivery", detail: "Reserve an available order" },
            { title: "Open navigation", detail: "Pickup and customer route" },
            { title: "Verify OTP", detail: "Complete delivery securely" },
            { title: "Request payout", detail: "Withdraw available earning" }
          ]}
        />
      </div>
    </PanelShell>
  );
}
