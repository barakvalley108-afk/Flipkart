import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const cookieName = "quickcart_panel_session";

const roleRoutes = [
  { prefix: "/admin", role: "SUPER_ADMIN" },
  { prefix: "/restaurant", role: "RESTAURANT" },
  { prefix: "/grocery", role: "GROCERY" },
  { prefix: "/delivery", role: "DELIVERY" }
] as const;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const match = roleRoutes.find(({ prefix }) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!match) return NextResponse.next();

  const secret = getSecret();
  const token = request.cookies.get(cookieName)?.value;

  if (!secret || !token) {
    return NextResponse.redirect(new URL("/panel-login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"]
    });

    if (payload.role !== match.role) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/panel-login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/restaurant/:path*", "/grocery/:path*", "/delivery/:path*"]
};
