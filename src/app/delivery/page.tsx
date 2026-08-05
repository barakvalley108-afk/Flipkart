import { PanelConsole } from "@/components/panel-console";
import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Delivery Rider Panel" };
export default async function DeliveryPage() { const session = await requireRole(["DELIVERY"]); return <PanelShell role="DELIVERY" email={session.user.email ?? undefined}><PanelConsole role="DELIVERY" /></PanelShell>; }
