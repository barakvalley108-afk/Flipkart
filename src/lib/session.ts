import "server-only";

import { SignJWT, jwtVerify } from "jose";
import type { PanelRole, SessionPayload } from "@/lib/types";

const COOKIE_NAME = "quickcart_panel_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function getSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(email: string, role: PanelRole) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const token = await new SignJWT({
    email,
    role,
    expiresAt: expiresAt.toISOString()
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());

  return { token, expiresAt };
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"]
    });

    if (
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      email: payload.email,
      role: payload.role as PanelRole,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

export const panelSessionCookie = {
  name: COOKIE_NAME,
  durationSeconds: SESSION_DURATION_SECONDS
};
