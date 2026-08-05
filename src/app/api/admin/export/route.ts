import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

function cell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeApi(["SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;
  const type = z.enum(["orders", "payments", "cod", "sales"]).safeParse(request.nextUrl.searchParams.get("type"));
  if (!type.success) return NextResponse.json({ message: "Invalid export type." }, { status: 400 });

  const orders = await db.order.findMany({
    where: type.data === "cod" ? { paymentMethod: "COD" } : {},
    include: { customer: { select: { name: true, phone: true } }, store: { select: { name: true } }, payment: true, delivery: true },
    orderBy: { createdAt: "desc" },
    take: 5000
  });
  const rows = [
    ["Order", "Created", "Customer", "Phone", "Store", "Type", "Status", "Payment", "Subtotal (paise)", "Discount (paise)", "Delivery (paise)", "Total (paise)", "COD collected (paise)"],
    ...orders.map((order) => [order.orderNumber, order.createdAt, order.customer.name, order.customer.phone, order.store.name, order.type, order.status, order.payment?.status, order.subtotalPaise, order.discountPaise, order.deliveryFeePaise, order.totalPaise, order.delivery?.codCollectedPaise ?? 0])
  ];
  const csv = rows.map((row) => row.map(cell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="quickcart-${type.data}-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
