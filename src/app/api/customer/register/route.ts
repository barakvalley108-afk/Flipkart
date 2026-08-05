import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requestFingerprint } from "@/lib/security";
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "@/lib/rate-limit";
import { createSessionToken, sessionCookie } from "@/lib/session";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  password: z.string().min(10).max(128)
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/\d/, "Add a number")
});

export async function POST(request: NextRequest) {
  const parsed = RegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      message: "Please correct the highlighted information.",
      fieldErrors: parsed.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const key = requestFingerprint(request, parsed.data.phone);
  if (!checkLoginLimit(key).allowed) {
    return NextResponse.json({ message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const email = parsed.data.email?.toLowerCase() || null;
  const exists = await db.user.findFirst({
    where: { OR: [{ phone: parsed.data.phone }, ...(email ? [{ email }] : [])] },
    select: { id: true }
  });
  if (exists) {
    recordLoginFailure(key);
    return NextResponse.json({ message: "An account already uses these details." }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: "CUSTOMER",
      cart: { create: {} }
    }
  });

  clearLoginFailures(key);
  const { token, expiresAt } = await createSessionToken(user);
  const response = NextResponse.json({ ok: true, redirectTo: "/" }, { status: 201 });
  response.cookies.set(sessionCookie.name, token, { ...sessionCookie.options, expires: expiresAt });
  return response;
}
