import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { canCancelOrder } from "@/lib/order-workflow";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("reorder") })
]);

function addonIds(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.id === "string") return [entry.id];
    return [];
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid order action." }, { status: 400 });
  const { id } = await context.params;

  const order = await db.order.findFirst({
    where: { id, customerId: auth.user.id },
    include: { items: { include: { variant: true } } }
  });
  if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });

  if (parsed.data.action === "cancel") {
    const cancellationReason = parsed.data.reason;
    if (!canCancelOrder(order.status)) {
      return NextResponse.json({ message: "The cancellation cutoff has passed. Contact support for help." }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason,
          statusHistory: [...history, { status: "CANCELLED", at: new Date().toISOString(), by: auth.user.id }]
        }
      });
      if (order.paymentStatus === "PAID") {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUND_PENDING" } });
        await tx.payment.update({ where: { orderId: order.id }, data: { status: "REFUND_PENDING" } });
      }
    });
    return NextResponse.json({ ok: true });
  }

  const unavailable = order.items.find((item) => !item.variant.isAvailable || item.variant.stock < item.quantity);
  if (unavailable) return NextResponse.json({ message: `${unavailable.productName} is currently unavailable.` }, { status: 409 });
  const cart = await db.cart.upsert({ where: { userId: auth.user.id }, update: {}, create: { userId: auth.user.id } });
  const cartCount = await db.cartItem.count({ where: { cartId: cart.id } });
  if (cartCount > 0 && cart.storeId && cart.storeId !== order.storeId) {
    return NextResponse.json({ message: "Clear the current cart before reordering from this store." }, { status: 409 });
  }
  await db.$transaction(async (tx) => {
    await tx.cart.update({ where: { id: cart.id }, data: { storeId: order.storeId } });
    for (const item of order.items) {
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
        update: { quantity: item.quantity, selectedAddons: addonIds(item.addons) },
        create: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity, selectedAddons: addonIds(item.addons) }
      });
    }
  });
  return NextResponse.json({ ok: true, redirectTo: "/checkout" });
}
