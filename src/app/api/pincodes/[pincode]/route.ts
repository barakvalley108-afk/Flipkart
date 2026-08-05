import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ pincode: string }> }) {
  const { pincode } = await context.params;
  if (!z.string().regex(/^\d{6}$/).safeParse(pincode).success) {
    return NextResponse.json({ message: "Enter a valid six-digit pincode." }, { status: 400 });
  }
  const record = await db.serviceablePincode.findUnique({ where: { pincode } });
  return NextResponse.json({
    data: record?.isActive
      ? { serviceable: true, city: record.city, state: record.state, deliveryFeePaise: record.deliveryFeePaise, minimumOrderPaise: record.minimumOrderPaise, estimatedDeliveryMin: record.estimatedDeliveryMin }
      : { serviceable: false }
  });
}
