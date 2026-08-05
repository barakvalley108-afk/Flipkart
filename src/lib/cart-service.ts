import "server-only";

import { db } from "@/lib/db";

function addonIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getCartSnapshot(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      store: { select: { id: true, name: true, slug: true, isOpen: true, minimumOrderPaise: true, deliveryFeePaise: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              product: {
                include: { addons: { where: { isAvailable: true } } }
              }
            }
          }
        }
      }
    }
  });

  if (!cart) return { id: null, store: null, items: [], itemCount: 0, subtotalPaise: 0 };
  const items = cart.items.map((item) => {
    const selectedIds = addonIds(item.selectedAddons);
    const addons = item.variant.product.addons.filter((addon) => selectedIds.includes(addon.id));
    const addonTotalPaise = addons.reduce((sum, addon) => sum + addon.pricePaise, 0);
    return {
      id: item.id,
      quantity: item.quantity,
      selectedAddons: addons,
      variant: {
        id: item.variant.id,
        name: item.variant.name,
        unit: item.variant.unit,
        mrpPaise: item.variant.mrpPaise,
        salePricePaise: item.variant.salePricePaise,
        stock: item.variant.stock,
        isAvailable: item.variant.isAvailable
      },
      product: {
        id: item.variant.product.id,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        imageUrl: item.variant.product.imageUrl,
        storeId: item.variant.product.storeId
      },
      unitTotalPaise: item.variant.salePricePaise + addonTotalPaise,
      lineTotalPaise: (item.variant.salePricePaise + addonTotalPaise) * item.quantity
    };
  });

  return {
    id: cart.id,
    store: cart.store,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalPaise: items.reduce((sum, item) => sum + item.lineTotalPaise, 0)
  };
}
