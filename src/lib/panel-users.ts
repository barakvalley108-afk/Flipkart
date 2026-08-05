import "server-only";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { PanelRole } from "@/lib/types";

export async function verifyPanelCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.role === "CUSTOMER" || !user.isActive) return null;
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, name: user.name, email: user.email, role: user.role as PanelRole };
}

export function getRolePath(role: PanelRole) {
  return {
    SUPER_ADMIN: "/admin",
    RESTAURANT: "/restaurant",
    GROCERY: "/grocery",
    DELIVERY: "/delivery"
  }[role];
}
