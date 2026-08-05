import "server-only";

import { BannerPlacement, StoreType } from "@prisma/client";
import { db } from "@/lib/db";

export function fuzzyIncludes(source: string, query: string) {
  const a = source.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!b || a.includes(b)) return true;
  if (b.length < 4) return false;
  for (let i = 0; i <= a.length - b.length; i += 1) {
    const piece = a.slice(i, i + b.length);
    let differences = 0;
    for (let j = 0; j < b.length; j += 1) if (piece[j] !== b[j]) differences += 1;
    if (differences <= Math.max(1, Math.floor(b.length / 5))) return true;
  }
  return false;
}

export async function getCatalog(input?: {
  mode?: "food" | "grocery";
  query?: string;
  category?: string;
  veg?: boolean;
  storeId?: string;
}) {
  const type = input?.mode === "food" ? StoreType.RESTAURANT : StoreType.GROCERY;
  const products = await db.product.findMany({
    where: {
      isActive: true,
      store: { type, isApproved: true },
      ...(input?.storeId ? { storeId: input.storeId } : {}),
      ...(input?.category ? { category: { slug: input.category } } : {}),
      ...(input?.veg !== undefined ? { isVeg: input.veg } : {})
    },
    include: {
      store: { select: { id: true, name: true, slug: true, isOpen: true, rating: true, averagePrepMins: true, minimumOrderPaise: true } },
      category: { select: { id: true, name: true, slug: true } },
      variants: { orderBy: { salePricePaise: "asc" } },
      addons: { where: { isAvailable: true }, orderBy: { pricePaise: "asc" } }
    },
    orderBy: [{ store: { rating: "desc" } }, { name: "asc" }],
    take: 120
  });

  const query = input?.query?.trim();
  const filtered = query
    ? products.filter((product) =>
        [product.name, product.store.name, product.category.name].some((value) => fuzzyIncludes(value, query)))
    : products;

  const [categories, stores, banners] = await Promise.all([
    db.category.findMany({
      where: { type, isActive: true, store: { isApproved: true } },
      select: { id: true, name: true, slug: true, imageUrl: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.store.findMany({
      where: { type, isApproved: true },
      select: { id: true, name: true, slug: true, description: true, imageUrl: true, isOpen: true, rating: true, averagePrepMins: true, minimumOrderPaise: true, deliveryFeePaise: true },
      orderBy: [{ isOpen: "desc" }, { rating: "desc" }]
    }),
    db.banner.findMany({
      where: {
        isActive: true,
        placement: { in: [BannerPlacement.HOME, type === StoreType.RESTAURANT ? BannerPlacement.FOOD : BannerPlacement.GROCERY] },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }
        ]
      },
      orderBy: { sortOrder: "asc" }
    })
  ]);

  return {
    mode: input?.mode ?? "grocery",
    categories: [...new Map(categories.map((category) => [category.slug, category])).values()],
    stores: stores.map((store) => ({ ...store, rating: Number(store.rating) })),
    banners,
    products: filtered.map((product) => ({
      ...product,
      store: { ...product.store, rating: Number(product.store.rating) }
    }))
  };
}
