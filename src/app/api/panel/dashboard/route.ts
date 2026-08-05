import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

function dayStart(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function GET() {
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const today = dayStart();
  const month = monthStart();

  if (auth.user.role === "SUPER_ADMIN") {
    const [todayAgg, monthAgg, customers, restaurants, groceries, riders, recentOrders, statusGroups, unread, logs] = await Promise.all([
      db.order.aggregate({ where: { createdAt: { gte: today }, status: { not: "CANCELLED" } }, _count: true, _sum: { totalPaise: true, deliveryFeePaise: true } }),
      db.order.aggregate({ where: { createdAt: { gte: month }, status: { not: "CANCELLED" } }, _sum: { totalPaise: true, deliveryFeePaise: true } }),
      db.user.count({ where: { role: "CUSTOMER", isActive: true } }),
      db.store.count({ where: { type: "RESTAURANT", isApproved: true } }),
      db.store.count({ where: { type: "GROCERY", isApproved: true } }),
      db.user.count({ where: { role: "DELIVERY", isActive: true } }),
      db.order.findMany({ include: { customer: { select: { name: true } }, store: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.order.groupBy({ by: ["status"], _count: true }),
      db.notification.count({ where: { userId: auth.user.id, readAt: null } }),
      db.adminActivityLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 })
    ]);

    const dailySales = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const start = dayStart(date);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const result = await db.order.aggregate({ where: { createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, _sum: { totalPaise: true } });
      return { label: start.toLocaleDateString("en-IN", { weekday: "short" }), value: result._sum.totalPaise ?? 0 };
    }));

    return NextResponse.json({ data: {
      metrics: {
        todayOrders: todayAgg._count,
        todaySalesPaise: todayAgg._sum.totalPaise ?? 0,
        monthlySalesPaise: monthAgg._sum.totalPaise ?? 0,
        deliveryCollectionPaise: monthAgg._sum.deliveryFeePaise ?? 0,
        activeCustomers: customers,
        activeRestaurants: restaurants,
        activeGroceryStores: groceries,
        activeRiders: riders
      },
      recentOrders,
      dailySales,
      statusGroups: statusGroups.map((group) => ({ status: group.status, count: group._count })),
      unreadNotifications: unread,
      logs
    } });
  }

  if (auth.user.role === "DELIVERY") {
    const [todayEarning, monthEarning, todayDeliveries, codHeld, assignments, unread] = await Promise.all([
      db.riderWalletTransaction.aggregate({ where: { riderId: auth.user.id, type: "DELIVERY_EARNING", createdAt: { gte: today } }, _sum: { amountPaise: true } }),
      db.riderWalletTransaction.aggregate({ where: { riderId: auth.user.id, type: "DELIVERY_EARNING", createdAt: { gte: month } }, _sum: { amountPaise: true } }),
      db.deliveryAssignment.count({ where: { riderId: auth.user.id, deliveredAt: { gte: today } } }),
      db.deliveryAssignment.aggregate({ where: { riderId: auth.user.id, deliveredAt: { gte: today } }, _sum: { codCollectedPaise: true } }),
      db.deliveryAssignment.findMany({
        where: { riderId: auth.user.id },
        include: { order: { include: { store: true, address: true, customer: { select: { name: true, phone: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      db.notification.count({ where: { userId: auth.user.id, readAt: null } })
    ]);
    return NextResponse.json({ data: {
      metrics: { todayEarningPaise: todayEarning._sum.amountPaise ?? 0, monthlyEarningPaise: monthEarning._sum.amountPaise ?? 0, todayDeliveries, codHeldPaise: codHeld._sum.codCollectedPaise ?? 0 },
      assignments: assignments.map((assignment) => ({
        ...assignment,
        deliveryOtpHash: undefined,
        order: {
          ...assignment.order,
          customer: {
            name: assignment.order.customer.name,
            phone: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(assignment.order.status) ? assignment.order.customer.phone : null
          }
        }
      })),
      unreadNotifications: unread
    } });
  }

  const store = await db.store.findFirst({ where: { ownerId: auth.user.id } });
  if (!store) return NextResponse.json({ message: "No store is assigned to this account." }, { status: 404 });
  const [todayAgg, monthAgg, activeOrders, lowStock, products, recentOrders, unread] = await Promise.all([
    db.order.aggregate({ where: { storeId: store.id, createdAt: { gte: today }, status: { not: "CANCELLED" } }, _count: true, _sum: { totalPaise: true } }),
    db.order.aggregate({ where: { storeId: store.id, createdAt: { gte: month }, status: { not: "CANCELLED" } }, _sum: { totalPaise: true } }),
    db.order.count({ where: { storeId: store.id, status: { in: ["PLACED", "ACCEPTED", "CONFIRMED", "PREPARING", "PACKING", "READY_FOR_PICKUP"] } } }),
    db.productVariant.count({ where: { product: { storeId: store.id }, stock: { lte: 5 } } }),
    db.product.count({ where: { storeId: store.id, isActive: true } }),
    db.order.findMany({ where: { storeId: store.id }, include: { customer: { select: { name: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.notification.count({ where: { userId: auth.user.id, readAt: null } })
  ]);
  return NextResponse.json({ data: {
    store,
    metrics: { todayOrders: todayAgg._count, todaySalesPaise: todayAgg._sum.totalPaise ?? 0, monthlySalesPaise: monthAgg._sum.totalPaise ?? 0, activeOrders, lowStock, products },
    recentOrders,
    unreadNotifications: unread
  } });
}
