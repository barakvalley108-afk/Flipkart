import "server-only";

import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload, UserRoleValue } from "@/lib/types";

const COOKIE_NAME = "quickcart_session";
const PANEL_SESSION_SECONDS = 60 * 60 * 12;
const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: {
  id: string;
  name: string;
  email: string | null;
  role: UserRoleValue;
}) {
  const duration = user.role === "CUSTOMER" ? CUSTOMER_SESSION_SECONDS : PANEL_SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + duration * 1000);

  const token = await new SignJWT({
    name: user.name,
    email: user.email ?? undefined,
    role: user.role,
    expiresAt: expiresAt.toISOString()
  })
    .setSubject(user.id)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());

  return { token, expiresAt };
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.expiresAt !== "string"
    ) return null;

    return {
      userId: payload.sub,
      name: payload.name,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: payload.role as UserRoleValue,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    priority: "high" as const
  }
};

export const panelSessionCookie = sessionCookie;
