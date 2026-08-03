import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { panelSessionCookie, verifySessionToken } from "@/lib/session";
import type { PanelRole } from "@/lib/types";

export async function requireRole(allowedRoles: PanelRole[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get(panelSessionCookie.name)?.value;
  const session = await verifySessionToken(token);

  if (!session) redirect("/panel-login");
  if (!allowedRoles.includes(session.role)) redirect("/unauthorized");

  return session;
}
