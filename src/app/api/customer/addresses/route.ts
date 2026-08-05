import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

const AddressSchema = z.object({
  id: z.string().max(64).optional(),
  label: z.string().trim().min(2).max(30),
  recipient: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  line1: z.string().trim().min(5).max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/),
  isDefault: z.boolean().default(false)
});

async function saveAddress(request: NextRequest, update: boolean) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const parsed = AddressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please complete the address correctly.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const serviceable = await db.serviceablePincode.findUnique({ where: { pincode: parsed.data.pincode } });
  if (!serviceable?.isActive) return NextResponse.json({ message: "This pincode is not serviceable yet." }, { status: 409 });
  if (update && !parsed.data.id) return NextResponse.json({ message: "Address ID is required." }, { status: 400 });

  const saved = await db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: auth.user.id } });
    const makeDefault = parsed.data.isDefault || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId: auth.user.id }, data: { isDefault: false } });
    const data = {
      label: parsed.data.label,
      recipient: parsed.data.recipient,
      phone: parsed.data.phone,
      line1: parsed.data.line1,
      line2: parsed.data.line2 || null,
      landmark: parsed.data.landmark || null,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      isDefault: makeDefault
    };
    if (update) {
      const existing = await tx.address.findFirst({ where: { id: parsed.data.id, userId: auth.user.id } });
      if (!existing) throw new Error("NOT_FOUND");
      return tx.address.update({ where: { id: existing.id }, data });
    }
    return tx.address.create({ data: { ...data, userId: auth.user.id } });
  });
  return NextResponse.json({ data: saved }, { status: update ? 200 : 201 });
}

export async function POST(request: NextRequest) {
  return saveAddress(request, false);
}

export async function PATCH(request: NextRequest) {
  try {
    return await saveAddress(request, true);
  } catch {
    return NextResponse.json({ message: "Address not found." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Address ID is required." }, { status: 400 });
  const address = await db.address.findFirst({ where: { id, userId: auth.user.id }, include: { _count: { select: { orders: true } } } });
  if (!address) return NextResponse.json({ message: "Address not found." }, { status: 404 });
  if (address._count.orders > 0) return NextResponse.json({ message: "An address used by an order cannot be deleted; edit it instead." }, { status: 409 });
  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (address.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: auth.user.id }, orderBy: { createdAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return NextResponse.json({ ok: true });
}
