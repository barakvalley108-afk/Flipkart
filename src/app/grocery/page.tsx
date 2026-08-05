import { PanelConsole } from "@/components/panel-console";
import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Grocery Panel" };
export default async function GroceryPage() { const session = await requireRole(["GROCERY"]); return <PanelShell role="GROCERY" email={session.user.email ?? undefined}><PanelConsole role="GROCERY" /></PanelShell>; }
