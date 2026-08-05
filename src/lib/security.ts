import { NextRequest, NextResponse } from "next/server";

export function requestFingerprint(request: Request, identity = "anonymous") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${identity.trim().toLowerCase()}`;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === request.nextUrl.origin) return null;
  return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
}

export function publicUser<T extends {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: unknown;
  isActive: boolean;
}>(user: T) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive
  };
}
