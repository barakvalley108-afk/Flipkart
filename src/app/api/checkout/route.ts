import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { getCommerceSettings } from "@/lib/site-settings";

const CheckoutSchema = z.object({
  addressId: z.string().min(1).max(64),
  paymentMethod: z.enum(["COD", "UPI"]),
  couponCode: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(300).optional()
});

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER"]);
  if ("response" in auth) return auth.response;
  const commerceSettings = await getCommerceSettings();
  if (commerceSettings.maintenanceMode) return NextResponse.json({ message: "Checkout is temporarily paused for maintenance." }, { status: 503 });
  const parsed = CheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please complete all checkout information.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const [address, cart] = await Promise.all([
        tx.address.findFirst({ where: { id: parsed.data.addressId, userId: auth.user.id } }),
        tx.cart.findUnique({
          where: { userId: auth.user.id },
          include: {
            store: true,
            items: { include: { variant: { include: { product: { include: { addons: true } } } } } }
          }
        })
      ]);
      if (!address) throw new Error("ADDRESS_NOT_FOUND");
      if (!cart?.store || cart.items.length === 0) throw new Error("EMPTY_CART");
      if (!cart.store.isOpen || !cart.store.isApproved) throw new Error("STORE_CLOSED");

      const pincode = await tx.serviceablePincode.findUnique({ where: { pincode: address.pincode } });
      if (!pincode?.isActive) throw new Error("UNSERVICEABLE_PINCODE");

      let subtotalPaise = 0;
      const lines = [];
      for (const item of cart.items) {
        if (!item.variant.isAvailable || !item.variant.product.isActive || item.quantity > item.variant.stock) {
          throw new Error(`OUT_OF_STOCK:${item.variant.product.name}`);
        }
        if (item.variant.product.storeId !== cart.storeId) throw new Error("CROSS_STORE_CART");
        const selectedIds = stringArray(item.selectedAddons);
        const addons = item.variant.product.addons.filter((addon) => selectedIds.includes(addon.id) && addon.isAvailable);
        const addonTotalPaise = addons.reduce((sum, addon) => sum + addon.pricePaise, 0);
        const totalPaise = (item.variant.salePricePaise + addonTotalPaise) * item.quantity;
        subtotalPaise += totalPaise;
        lines.push({ item, addons, addonTotalPaise, totalPaise });
      }

      const minimumOrderPaise = Math.max(cart.store.minimumOrderPaise, pincode.minimumOrderPaise);
      if (subtotalPaise < minimumOrderPaise) throw new Error(`MINIMUM_ORDER:${minimumOrderPaise}`);

      let coupon: Awaited<ReturnType<typeof tx.coupon.findUnique>> = null;
      let discountPaise = 0;
      const code = parsed.data.couponCode?.toUpperCase();
      if (code) {
        coupon = await tx.coupon.findUnique({ where: { code } });
        const now = new Date();
        if (!coupon?.isActive || coupon.startsAt > now || coupon.expiresAt < now) throw new Error("INVALID_COUPON");
        if (subtotalPaise < coupon.minimumOrderPaise) throw new Error(`COUPON_MINIMUM:${coupon.minimumOrderPaise}`);
        const [userUses, totalUses] = await Promise.all([
          tx.couponUsage.count({ where: { couponId: coupon.id, userId: auth.user.id } }),
          tx.couponUsage.count({ where: { couponId: coupon.id } })
        ]);
        if (userUses >= coupon.perUserLimit || (coupon.usageLimit !== null && totalUses >= coupon.usageLimit)) throw new Error("COUPON_LIMIT");
        discountPaise = coupon.discountType === "PERCENTAGE"
          ? Math.floor(subtotalPaise * coupon.discountValue / 100)
          : coupon.discountValue;
        if (coupon.maxDiscountPaise !== null) discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
        discountPaise = Math.min(discountPaise, subtotalPaise);
      }

      const deliveryFeePaise = pincode.deliveryFeePaise;
      const totalPaise = subtotalPaise - discountPaise + deliveryFeePaise;
      const stamp = `${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
      const statusHistory = [{ status: "PLACED", at: new Date().toISOString(), by: auth.user.id }];
      const created = await tx.order.create({
        data: {
          orderNumber: `QC-${stamp}`,
          invoiceNumber: `INV-${stamp}`,
          type: cart.store.type === "RESTAURANT" ? "FOOD" : "GROCERY",
          customerId: auth.user.id,
          storeId: cart.store.id,
          addressId: address.id,
          subtotalPaise,
          discountPaise,
          deliveryFeePaise,
          totalPaise,
          paymentMethod: parsed.data.paymentMethod,
          notes: parsed.data.notes || null,
          statusHistory,
          items: {
            create: lines.map(({ item, addons, addonTotalPaise, totalPaise: lineTotal }) => ({
              productId: item.variant.product.id,
              variantId: item.variant.id,
              productName: item.variant.product.name,
              variantName: item.variant.name,
              unitPricePaise: item.variant.salePricePaise,
              quantity: item.quantity,
              addonTotalPaise,
              totalPaise: lineTotal,
              addons: addons.map((addon) => ({ id: addon.id, name: addon.name, pricePaise: addon.pricePaise }))
            }))
          },
          payment: { create: { method: parsed.data.paymentMethod, amountPaise: totalPaise } }
        }
      });

      for (const { item } of lines) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw new Error(`OUT_OF_STOCK:${item.variant.product.name}`);
      }
      if (coupon) {
        await tx.couponUsage.create({ data: { couponId: coupon.id, userId: auth.user.id, orderId: created.id, discountPaise } });
      }
      await tx.notification.create({
        data: {
          userId: cart.store.ownerId,
          type: "ORDER",
          title: "New order received",
          message: `${created.orderNumber} is waiting for acceptance.`,
          data: { orderId: created.id }
        }
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { storeId: null } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        upiReady: order.paymentMethod === "UPI",
        message: order.paymentMethod === "UPI" ? "UPI provider integration is prepared but not enabled. The order remains payment-pending." : "Order placed successfully."
      }
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    if (message.startsWith("MINIMUM_ORDER:") || message.startsWith("COUPON_MINIMUM:")) {
      return NextResponse.json({ message: "The cart does not meet the required minimum order." }, { status: 409 });
    }
    if (message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ message: `${message.split(":")[1]} is no longer available in that quantity.` }, { status: 409 });
    }
    const messages: Record<string, string> = {
      ADDRESS_NOT_FOUND: "Choose a valid saved address.",
      EMPTY_CART: "Your cart is empty.",
      STORE_CLOSED: "The selected store is currently closed.",
      UNSERVICEABLE_PINCODE: "Delivery is not available at this pincode.",
      CROSS_STORE_CART: "The cart contains products from more than one store.",
      INVALID_COUPON: "This coupon is invalid or has expired.",
      COUPON_LIMIT: "This coupon has already reached its usage limit."
    };
    return NextResponse.json({ message: messages[message] ?? "Checkout could not be completed. Please retry." }, { status: 409 });
  }
}
