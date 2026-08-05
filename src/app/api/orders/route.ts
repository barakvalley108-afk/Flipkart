import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const orders = await db.order.findMany({
    where: { customerId: auth.user.id },
    include: {
      store: { select: { name: true, slug: true, imageUrl: true } },
      items: { select: { productName: true, variantName: true, quantity: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ data: orders });
}
