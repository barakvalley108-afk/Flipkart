import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { requestFingerprint } from "@/lib/security";
import { createSessionToken, sessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  identity: z.string().trim().min(5).max(254),
  password: z.string().min(10).max(128)
});

export async function POST(request: NextRequest) {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Email/phone or password is incorrect." }, { status: 400 });
  }
  const identity = parsed.data.identity.toLowerCase();
  const key = requestFingerprint(request, identity);
  const limit = checkLoginLimit(key);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many sign-in attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }

  const user = await db.user.findFirst({
    where: {
      role: "CUSTOMER",
      OR: [{ email: identity }, { phone: parsed.data.identity }]
    }
  });
  if (!user?.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    recordLoginFailure(key);
    return NextResponse.json({ message: "Email/phone or password is incorrect." }, { status: 401 });
  }

  clearLoginFailures(key);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const { token, expiresAt } = await createSessionToken(user);
  const response = NextResponse.json({ ok: true, redirectTo: "/" });
  response.cookies.set(sessionCookie.name, token, { ...sessionCookie.options, expires: expiresAt });
  return response;
}
