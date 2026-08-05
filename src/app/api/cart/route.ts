import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { getCartSnapshot } from "@/lib/cart-service";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

const AddSchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(20).default(1),
  addonIds: z.array(z.string().min(1).max(64)).max(10).default([])
});

const UpdateSchema = z.object({
  itemId: z.string().min(1).max(64),
  quantity: z.number().int().min(0).max(20)
});

export async function GET() {
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ data: await getCartSnapshot(auth.user.id) });
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid cart item." }, { status: 400 });

  const variant = await db.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    include: { product: { include: { store: true, addons: true } } }
  });
  if (!variant?.isAvailable || !variant.product.isActive || !variant.product.store.isApproved) {
    return NextResponse.json({ message: "This item is currently unavailable." }, { status: 409 });
  }
  if (!variant.product.store.isOpen) {
    return NextResponse.json({ message: "This store is currently closed." }, { status: 409 });
  }
  const validAddonIds = new Set(variant.product.addons.filter((addon) => addon.isAvailable).map((addon) => addon.id));
  if (parsed.data.addonIds.some((id) => !validAddonIds.has(id))) {
    return NextResponse.json({ message: "One or more selected add-ons are unavailable." }, { status: 409 });
  }

  const result = await db.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId: auth.user.id },
      update: {},
      create: { userId: auth.user.id }
    });
    const existingItems = await tx.cartItem.count({ where: { cartId: cart.id } });
    if (existingItems > 0 && cart.storeId && cart.storeId !== variant.product.storeId) {
      return { conflict: true as const };
    }

    const current = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } }
    });
    const nextQuantity = (current?.quantity ?? 0) + parsed.data.quantity;
    if (nextQuantity > variant.stock) return { stock: true as const };
    await tx.cart.update({ where: { id: cart.id }, data: { storeId: variant.product.storeId } });
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: { quantity: nextQuantity, selectedAddons: parsed.data.addonIds },
      create: { cartId: cart.id, variantId: variant.id, quantity: parsed.data.quantity, selectedAddons: parsed.data.addonIds }
    });
    return { ok: true as const };
  });

  if ("conflict" in result) {
    return NextResponse.json({ code: "CROSS_STORE_CART", message: "Finish or clear your current store cart before adding from another store." }, { status: 409 });
  }
  if ("stock" in result) return NextResponse.json({ message: "Requested quantity exceeds available stock." }, { status: 409 });
  return NextResponse.json({ data: await getCartSnapshot(auth.user.id) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid quantity." }, { status: 400 });

  const item = await db.cartItem.findFirst({
    where: { id: parsed.data.itemId, cart: { userId: auth.user.id } },
    include: { variant: true, cart: true }
  });
  if (!item) return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
  if (parsed.data.quantity > item.variant.stock) {
    return NextResponse.json({ message: "Requested quantity exceeds available stock." }, { status: 409 });
  }

  await db.$transaction(async (tx) => {
    if (parsed.data.quantity === 0) await tx.cartItem.delete({ where: { id: item.id } });
    else await tx.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });
    const remaining = await tx.cartItem.count({ where: { cartId: item.cartId, ...(parsed.data.quantity === 0 ? { id: { not: item.id } } : {}) } });
    if (remaining === 0) await tx.cart.update({ where: { id: item.cartId }, data: { storeId: null } });
  });
  return NextResponse.json({ data: await getCartSnapshot(auth.user.id) });
}

export async function DELETE(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const cart = await db.cart.findUnique({ where: { userId: auth.user.id } });
  if (cart) {
    await db.$transaction([
      db.cartItem.deleteMany({ where: { cartId: cart.id } }),
      db.cart.update({ where: { id: cart.id }, data: { storeId: null } })
    ]);
  }
  return NextResponse.json({ data: await getCartSnapshot(auth.user.id) });
}
