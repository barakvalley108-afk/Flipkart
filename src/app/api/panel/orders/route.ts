import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi, recordAdminActivity } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isValidOrderTransition, nextStoreStatus } from "@/lib/order-workflow";
import { assertSameOrigin } from "@/lib/security";
import { getCommerceSettings } from "@/lib/site-settings";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("advance"), orderId: z.string().min(1) }),
  z.object({ action: z.literal("reject"), orderId: z.string().min(1), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("assign"), orderId: z.string().min(1), riderId: z.string().min(1) }),
  z.object({ action: z.literal("setStatus"), orderId: z.string().min(1), status: z.enum(["CANCELLED", "REFUND_PENDING", "REFUNDED"]) }),
  z.object({ action: z.literal("riderAccept"), orderId: z.string().min(1) }),
  z.object({ action: z.literal("pickup"), orderId: z.string().min(1) }),
  z.object({ action: z.literal("outForDelivery"), orderId: z.string().min(1) }),
  z.object({ action: z.literal("deliver"), orderId: z.string().min(1), otp: z.string().regex(/^\d{4}$/), codCollectedPaise: z.number().int().min(0).default(0) })
]);

async function cancelAndRestoreStock(order: { id: string; status: OrderStatus }, reason: string) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason }
    });
    if (claimed.count !== 1) return false;

    const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { variantId: true, quantity: true } });
    for (const item of items) {
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    }
    return true;
  });
}

export async function GET() {
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const where = auth.user.role === "SUPER_ADMIN"
    ? {}
    : auth.user.role === "DELIVERY"
      ? { delivery: { riderId: auth.user.id } }
      : { store: { ownerId: auth.user.id } };
  const orders = await db.order.findMany({
    where,
    include: {
      store: { select: { id: true, name: true, address: true, phone: true } },
      customer: { select: { name: true, phone: true } },
      address: true,
      items: true,
      delivery: { include: { rider: { select: { id: true, name: true, phone: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 150
  });
  return NextResponse.json({ data: orders.map((order) => ({
    ...order,
    customer: {
      name: order.customer.name,
      phone: auth.user.role === "DELIVERY" && !["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) ? null : order.customer.phone
    },
    delivery: order.delivery ? { ...order.delivery, deliveryOtpHash: undefined } : null
  })) });
}

export async function PATCH(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid order action." }, { status: 400 });
  const order = await db.order.findUnique({ where: { id: parsed.data.orderId }, include: { store: true, delivery: true } });
  if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });

  const isStoreOwner = order.store.ownerId === auth.user.id;
  const isRider = order.delivery?.riderId === auth.user.id;
  if (auth.user.role !== "SUPER_ADMIN" && !isStoreOwner && !isRider) {
    return NextResponse.json({ message: "You cannot update this order." }, { status: 403 });
  }

  if (parsed.data.action === "advance") {
    if (!isStoreOwner && auth.user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "Store access required." }, { status: 403 });
    const next = nextStoreStatus(order.type, order.status);
    if (!next) return NextResponse.json({ message: "This order cannot be advanced by the store." }, { status: 409 });
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    await db.order.update({ where: { id: order.id }, data: { status: next, statusHistory: [...history, { status: next, at: new Date().toISOString(), by: auth.user.id }] } });
    return NextResponse.json({ ok: true, status: next });
  }

  if (parsed.data.action === "reject") {
    if ((!isStoreOwner && auth.user.role !== "SUPER_ADMIN") || !["PLACED", "ACCEPTED"].includes(order.status)) {
      return NextResponse.json({ message: "This order can no longer be rejected." }, { status: 409 });
    }
    const cancelled = await cancelAndRestoreStock(order, parsed.data.reason);
    if (!cancelled) return NextResponse.json({ message: "The order changed before it could be rejected." }, { status: 409 });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (parsed.data.action === "assign") {
    if (auth.user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    if (order.status !== "READY_FOR_PICKUP") return NextResponse.json({ message: "Order must be ready for pickup before rider assignment." }, { status: 409 });
    const rider = await db.user.findFirst({ where: { id: parsed.data.riderId, role: "DELIVERY", isActive: true } });
    if (!rider) return NextResponse.json({ message: "Active rider not found." }, { status: 404 });
    const otp = String(randomInt(1000, 10000));
    const commerceSettings = await getCommerceSettings();
    await db.$transaction(async (tx) => {
      await tx.deliveryAssignment.upsert({
        where: { orderId: order.id },
        update: { riderId: rider.id, deliveryOtpHash: await bcrypt.hash(otp, 10), status: "ASSIGNED", earningPaise: commerceSettings.riderEarningPaise },
        create: { orderId: order.id, riderId: rider.id, deliveryOtpHash: await bcrypt.hash(otp, 10), earningPaise: commerceSettings.riderEarningPaise }
      });
      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      await tx.order.update({ where: { id: order.id }, data: { status: "RIDER_ASSIGNED", statusHistory: [...history, { status: "RIDER_ASSIGNED", at: new Date().toISOString(), by: auth.user.id }] } });
      await tx.notification.createMany({ data: [
        { userId: rider.id, type: "ORDER", title: "New delivery assigned", message: `${order.orderNumber} is ready for pickup.`, data: { orderId: order.id } },
        { userId: order.customerId, type: "ORDER", title: "Delivery rider assigned", message: `Your delivery OTP is ${otp}. Share it only after receiving the order.`, data: { orderId: order.id, deliveryOtp: otp } }
      ] });
    });
    await recordAdminActivity({ actorId: auth.user.id, action: "ASSIGN_RIDER", entityType: "Order", entityId: order.id, metadata: { riderId: rider.id } });
    return NextResponse.json({ ok: true, status: "RIDER_ASSIGNED" });
  }

  if (parsed.data.action === "setStatus") {
    if (auth.user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    if (parsed.data.status === "CANCELLED") {
      if (["DELIVERED", "CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(order.status)) {
        return NextResponse.json({ message: "A terminal or refunding order cannot be cancelled." }, { status: 409 });
      }
      const cancelled = await cancelAndRestoreStock(order, "Cancelled by administrator");
      if (!cancelled) return NextResponse.json({ message: "The order changed before it could be cancelled." }, { status: 409 });
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }
    if (!isValidOrderTransition(order.type, order.status, parsed.data.status)) {
      return NextResponse.json({ message: "Invalid refund/status transition." }, { status: 409 });
    }
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: parsed.data.status, paymentStatus: parsed.data.status === "REFUND_PENDING" ? "REFUND_PENDING" : parsed.data.status === "REFUNDED" ? "REFUNDED" : undefined } }),
      ...(parsed.data.status === "REFUND_PENDING" || parsed.data.status === "REFUNDED"
        ? [db.payment.update({ where: { orderId: order.id }, data: { status: parsed.data.status } })]
        : [])
    ]);
    return NextResponse.json({ ok: true, status: parsed.data.status });
  }

  if (!isRider) return NextResponse.json({ message: "This delivery is not assigned to you." }, { status: 403 });
  if (parsed.data.action === "riderAccept") {
    if (order.delivery?.status !== "ASSIGNED") return NextResponse.json({ message: "Assignment cannot be accepted now." }, { status: 409 });
    await db.deliveryAssignment.update({ where: { orderId: order.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "pickup") {
    if (order.delivery?.status !== "ACCEPTED") return NextResponse.json({ message: "Accept the assignment before pickup." }, { status: 409 });
    await db.deliveryAssignment.update({ where: { orderId: order.id }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "outForDelivery") {
    if (order.delivery?.status !== "PICKED_UP") return NextResponse.json({ message: "Confirm pickup first." }, { status: 409 });
    await db.order.update({ where: { id: order.id }, data: { status: "OUT_FOR_DELIVERY" } });
    return NextResponse.json({ ok: true, status: "OUT_FOR_DELIVERY" });
  }
  if (parsed.data.action === "deliver") {
    if (order.status !== "OUT_FOR_DELIVERY" || !order.delivery || !(await bcrypt.compare(parsed.data.otp, order.delivery.deliveryOtpHash))) {
      return NextResponse.json({ message: "Delivery OTP is incorrect or the order is not ready." }, { status: 409 });
    }
    const codAmount = order.paymentMethod === "COD" ? order.totalPaise : 0;
    if (order.paymentMethod === "COD" && parsed.data.codCollectedPaise !== codAmount) {
      return NextResponse.json({ message: "Confirm the exact COD amount collected." }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "DELIVERED", deliveredAt: new Date(), paymentStatus: "PAID" } });
      await tx.payment.update({ where: { orderId: order.id }, data: { status: "PAID", paidAt: new Date() } });
      await tx.deliveryAssignment.update({ where: { orderId: order.id }, data: { status: "DELIVERED", deliveredAt: new Date(), codCollectedPaise: codAmount } });
      await tx.riderWalletTransaction.create({ data: { riderId: auth.user.id, orderId: order.id, type: "DELIVERY_EARNING", amountPaise: order.delivery!.earningPaise, note: `Earning for ${order.orderNumber}` } });
    });
    return NextResponse.json({ ok: true, status: "DELIVERED" });
  }
  return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
}
