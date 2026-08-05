import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const cookieName = "quickcart_session";
const protectedRoutes = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"], login: "/panel-login" },
  { prefix: "/restaurant", roles: ["RESTAURANT"], login: "/panel-login" },
  { prefix: "/grocery", roles: ["GROCERY"], login: "/panel-login" },
  { prefix: "/delivery", roles: ["DELIVERY"], login: "/panel-login" },
  { prefix: "/profile", roles: ["CUSTOMER"], login: "/login" },
  { prefix: "/orders", roles: ["CUSTOMER"], login: "/login" },
  { prefix: "/checkout", roles: ["CUSTOMER"], login: "/login" }
] as const;

function routeMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

export async function proxy(request: NextRequest) {
  const match = protectedRoutes.find(({ prefix }) => routeMatches(request.nextUrl.pathname, prefix));
  if (!match) return NextResponse.next();

  const secret = getSecret();
  const token = request.cookies.get(cookieName)?.value;
  if (!secret || !token) return NextResponse.redirect(new URL(match.login, request.url));

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!match.roles.some((role) => role === payload.role)) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(match.login, request.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/restaurant/:path*",
    "/grocery/:path*",
    "/delivery/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/checkout/:path*"
  ]
};
