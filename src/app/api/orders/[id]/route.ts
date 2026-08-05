import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const order = await db.order.findFirst({
    where: { id, customerId: auth.user.id },
    include: {
      store: true,
      address: true,
      items: true,
      payment: true,
      couponUsage: { include: { coupon: { select: { code: true } } } },
      delivery: { include: { rider: { select: { name: true, phone: true } } } }
    }
  });
  if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });
  const canSeeRiderPhone = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status);
  return NextResponse.json({
    data: {
      ...order,
      delivery: order.delivery ? {
        ...order.delivery,
        deliveryOtpHash: undefined,
        rider: { name: order.delivery.rider.name, phone: canSeeRiderPhone ? order.delivery.rider.phone : null }
      } : null
    }
  });
}
