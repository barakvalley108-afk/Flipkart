import { PanelConsole } from "@/components/panel-console";
import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Restaurant Panel" };
export default async function RestaurantPage() { const session = await requireRole(["RESTAURANT"]); return <PanelShell role="RESTAURANT" email={session.user.email ?? undefined}><PanelConsole role="RESTAURANT" /></PanelShell>; }
