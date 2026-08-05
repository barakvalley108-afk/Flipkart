import { PanelConsole } from "@/components/panel-console";
import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Super Admin" };
export default async function AdminPage() { const session = await requireRole(["SUPER_ADMIN"]); return <PanelShell role="SUPER_ADMIN" email={session.user.email ?? undefined}><PanelConsole role="SUPER_ADMIN" /></PanelShell>; }
