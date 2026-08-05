import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessionCookie, verifySessionToken } from "@/lib/session";
import type { UserRoleValue } from "@/lib/types";

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookie.name)?.value);
}

export async function requireRole(allowedRoles: UserRoleValue[]) {
  const session = await getSession();
  if (!session) redirect(allowedRoles.includes("CUSTOMER") ? "/login" : "/panel-login");
  if (!allowedRoles.includes(session.role)) redirect("/forbidden");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true }
  });
  if (!user?.isActive || user.role !== session.role) redirect("/unauthorized");
  return { ...session, user };
}
