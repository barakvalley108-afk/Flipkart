import "server-only";

import bcrypt from "bcryptjs";
import type { PanelRole } from "@/lib/types";

type PanelCredential = {
  role: PanelRole;
  email?: string;
  passwordHash?: string;
};

const credentials: PanelCredential[] = [
  {
    role: "SUPER_ADMIN",
    email: process.env.SUPER_ADMIN_EMAIL,
    passwordHash: process.env.SUPER_ADMIN_PASSWORD_HASH
  },
  {
    role: "RESTAURANT",
    email: process.env.RESTAURANT_EMAIL,
    passwordHash: process.env.RESTAURANT_PASSWORD_HASH
  },
  {
    role: "GROCERY",
    email: process.env.GROCERY_EMAIL,
    passwordHash: process.env.GROCERY_PASSWORD_HASH
  },
  {
    role: "DELIVERY",
    email: process.env.DELIVERY_EMAIL,
    passwordHash: process.env.DELIVERY_PASSWORD_HASH
  }
];

export async function verifyPanelCredentials(
  email: string,
  password: string
): Promise<{ email: string; role: PanelRole } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const candidate = credentials.find(
    (entry) => entry.email?.trim().toLowerCase() === normalizedEmail
  );

  if (!candidate?.email || !candidate.passwordHash) return null;
  const matches = await bcrypt.compare(password, candidate.passwordHash);
  if (!matches) return null;

  return {
    email: candidate.email,
    role: candidate.role
  };
}

export function getRolePath(role: PanelRole) {
  return {
    SUPER_ADMIN: "/admin",
    RESTAURANT: "/restaurant",
    GROCERY: "/grocery",
    DELIVERY: "/delivery"
  }[role];
}
