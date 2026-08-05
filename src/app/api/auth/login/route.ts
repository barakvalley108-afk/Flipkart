import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRolePath, verifyPanelCredentials } from "@/lib/panel-users";
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { requestFingerprint } from "@/lib/security";
import { createSessionToken, sessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128)
});

export async function POST(request: NextRequest) {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email and password." }, { status: 400 });
  }

  const key = requestFingerprint(request, parsed.data.email);
  const limit = checkLoginLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const user = await verifyPanelCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    recordLoginFailure(key);
    return NextResponse.json({ message: "Email or password is incorrect." }, { status: 401 });
  }

  clearLoginFailures(key);
  const { token, expiresAt } = await createSessionToken(user);
  const response = NextResponse.json({ ok: true, redirectTo: getRolePath(user.role) });
  response.cookies.set(sessionCookie.name, token, { ...sessionCookie.options, expires: expiresAt });
  return response;
}
