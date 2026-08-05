import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await db.product.findFirst({
    where: { id, isActive: true, store: { isApproved: true } },
    include: { store: true, category: true, variants: { orderBy: { salePricePaise: "asc" } }, addons: { where: { isAvailable: true } } }
  });
  if (!product) return NextResponse.json({ message: "Product not found." }, { status: 404 });
  return NextResponse.json({ data: { ...product, store: { ...product.store, rating: Number(product.store.rating) } } });
}
