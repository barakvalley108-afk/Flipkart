import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertSameOrigin, publicUser } from "@/lib/security";

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/)
});

export async function GET() {
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } }
  });
  if (!user) return NextResponse.json({ message: "Account not found." }, { status: 404 });
  return NextResponse.json({ data: { ...publicUser(user), addresses: user.addresses } });
}

export async function PATCH(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please correct the profile details.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const email = parsed.data.email?.toLowerCase() || null;
  const duplicate = await db.user.findFirst({
    where: { id: { not: auth.user.id }, OR: [{ phone: parsed.data.phone }, ...(email ? [{ email }] : [])] },
    select: { id: true }
  });
  if (duplicate) return NextResponse.json({ message: "Email or phone is already in use." }, { status: 409 });
  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone, email }
  });
  return NextResponse.json({ data: publicUser(user) });
}
