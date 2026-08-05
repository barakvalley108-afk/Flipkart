import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi, recordAdminActivity } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createPanelUser"), name: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: z.string().min(10).max(128), role: z.enum(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]) }),
  z.object({ action: z.literal("resetPassword"), userId: z.string().min(1), password: z.string().min(10).max(128) }),
  z.object({ action: z.literal("toggleUser"), userId: z.string().min(1), isActive: z.boolean() }),
  z.object({ action: z.literal("createStore"), ownerId: z.string().min(1), type: z.enum(["RESTAURANT", "GROCERY"]), name: z.string().trim().min(2).max(100), slug: z.string().regex(/^[a-z0-9-]+$/), phone: z.string().min(10).max(20), address: z.string().min(5).max(200), pincode: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("updateStore"), storeId: z.string().min(1), isOpen: z.boolean().optional(), isApproved: z.boolean().optional(), minimumOrderPaise: z.number().int().min(0).optional(), deliveryFeePaise: z.number().int().min(0).optional() }),
  z.object({ action: z.literal("createCategory"), storeId: z.string().min(1), name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9-]+$/), imageUrl: z.string().url().or(z.string().startsWith("/")) }),
  z.object({ action: z.literal("createProduct"), storeId: z.string().min(1), categoryId: z.string().min(1), name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().trim().max(500).optional(), imageUrl: z.string().url().or(z.string().startsWith("/")), isVeg: z.boolean().nullable(), variantName: z.string().trim().min(1).max(60), unit: z.string().trim().min(1).max(40), sku: z.string().trim().min(2).max(60), mrpPaise: z.number().int().min(0), salePricePaise: z.number().int().min(0), stock: z.number().int().min(0), lowStockAt: z.number().int().min(0).default(5), expiryDate: z.string().datetime().optional() }),
  z.object({ action: z.literal("updateProduct"), productId: z.string().min(1), name: z.string().trim().min(2).max(120).optional(), imageUrl: z.string().url().or(z.string().startsWith("/")).optional(), isActive: z.boolean().optional(), isVeg: z.boolean().nullable().optional() }),
  z.object({ action: z.literal("createVariant"), productId: z.string().min(1), name: z.string().trim().min(1).max(60), unit: z.string().trim().min(1).max(40), sku: z.string().trim().min(2).max(60), mrpPaise: z.number().int().min(0), salePricePaise: z.number().int().min(0), stock: z.number().int().min(0), lowStockAt: z.number().int().min(0).default(5), expiryDate: z.string().datetime().optional() }),
  z.object({ action: z.literal("updateVariant"), variantId: z.string().min(1), mrpPaise: z.number().int().min(0).optional(), salePricePaise: z.number().int().min(0).optional(), stock: z.number().int().min(0).optional(), lowStockAt: z.number().int().min(0).optional(), expiryDate: z.string().datetime().nullable().optional(), isAvailable: z.boolean().optional() }),
  z.object({ action: z.literal("createAddon"), productId: z.string().min(1), name: z.string().trim().min(1).max(80), pricePaise: z.number().int().min(0) }),
  z.object({ action: z.literal("createPincode"), pincode: z.string().regex(/^\d{6}$/), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), deliveryFeePaise: z.number().int().min(0), minimumOrderPaise: z.number().int().min(0) }),
  z.object({ action: z.literal("updatePincode"), id: z.string().min(1), deliveryFeePaise: z.number().int().min(0).optional(), minimumOrderPaise: z.number().int().min(0).optional(), isActive: z.boolean().optional() }),
  z.object({ action: z.literal("createCoupon"), code: z.string().trim().min(3).max(30), discountType: z.enum(["PERCENTAGE", "FIXED"]), discountValue: z.number().int().positive(), maxDiscountPaise: z.number().int().positive().nullable(), minimumOrderPaise: z.number().int().min(0), perUserLimit: z.number().int().min(1), startsAt: z.string().datetime(), expiresAt: z.string().datetime() }),
  z.object({ action: z.literal("toggleCoupon"), id: z.string().min(1), isActive: z.boolean() }),
  z.object({ action: z.literal("createBanner"), title: z.string().trim().min(2).max(100), subtitle: z.string().trim().max(180).optional(), imageUrl: z.string().url().or(z.string().startsWith("/")), linkUrl: z.string().max(200).optional(), placement: z.enum(["HOME", "FOOD", "GROCERY"]) }),
  z.object({ action: z.literal("toggleBanner"), id: z.string().min(1), isActive: z.boolean() }),
  z.object({ action: z.literal("updateCommerceSettings"), maintenanceMode: z.boolean(), riderEarningPaise: z.number().int().min(0), supportEmail: z.string().email() }),
  z.object({ action: z.literal("withdrawalRequest"), amountPaise: z.number().int().min(2000) })
]);

async function assignedStore(userId: string) {
  return db.store.findFirst({ where: { ownerId: userId } });
}

async function ownsStore(userId: string, role: string, storeId: string) {
  if (role === "SUPER_ADMIN") return true;
  return Boolean(await db.store.findFirst({ where: { id: storeId, ownerId: userId } }));
}

export async function GET() {
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;

  if (auth.user.role === "DELIVERY") {
    const transactions = await db.riderWalletTransaction.findMany({ where: { riderId: auth.user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ data: { transactions } });
  }

  const store = auth.user.role === "SUPER_ADMIN" ? null : await assignedStore(auth.user.id);
  const storeWhere = store ? { storeId: store.id } : {};
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: storeWhere, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.product.findMany({ where: storeWhere, include: { store: { select: { name: true, type: true } }, category: { select: { name: true } }, variants: { orderBy: { createdAt: "asc" } }, addons: true }, orderBy: { updatedAt: "desc" }, take: 300 })
  ]);
  if (auth.user.role !== "SUPER_ADMIN") return NextResponse.json({ data: { store, categories, products } });

  const [users, stores, pincodes, coupons, banners, settings, riders, logs] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.store.findMany({ include: { owner: { select: { name: true, email: true } }, _count: { select: { products: true, orders: true } } }, orderBy: { createdAt: "desc" } }),
    db.serviceablePincode.findMany({ orderBy: { pincode: "asc" } }),
    db.coupon.findMany({ include: { _count: { select: { usages: true } } }, orderBy: { createdAt: "desc" } }),
    db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.siteSetting.findMany(),
    db.user.findMany({ where: { role: "DELIVERY", isActive: true }, select: { id: true, name: true, email: true, phone: true } }),
    db.adminActivityLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return NextResponse.json({ data: { users, stores, categories, products, pincodes, coupons, banners, settings, riders, logs } });
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Please correct the form values.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data = parsed.data;
  const adminOnly = ["createPanelUser", "resetPassword", "toggleUser", "createStore", "createPincode", "updatePincode", "createCoupon", "toggleCoupon", "createBanner", "toggleBanner", "updateCommerceSettings"];
  if (adminOnly.includes(data.action) && auth.user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "Super Admin access required." }, { status: 403 });

  try {
    let result: unknown;
    if (data.action === "createPanelUser") {
      result = await db.user.create({ data: { name: data.name, email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(data.password, 12), role: data.role } });
    } else if (data.action === "resetPassword") {
      result = await db.user.update({ where: { id: data.userId }, data: { passwordHash: await bcrypt.hash(data.password, 12) } });
    } else if (data.action === "toggleUser") {
      if (data.userId === auth.user.id && !data.isActive) return NextResponse.json({ message: "You cannot deactivate your own account." }, { status: 409 });
      result = await db.user.update({ where: { id: data.userId }, data: { isActive: data.isActive } });
    } else if (data.action === "createStore") {
      const owner = await db.user.findUnique({ where: { id: data.ownerId } });
      if (!owner || owner.role !== data.type) return NextResponse.json({ message: "The selected panel user role does not match the store type." }, { status: 409 });
      result = await db.store.create({ data: { ownerId: data.ownerId, type: data.type, name: data.name, slug: data.slug, phone: data.phone, address: data.address, pincode: data.pincode, isApproved: true } });
    } else if (data.action === "updateStore") {
      if (!(await ownsStore(auth.user.id, auth.user.role, data.storeId))) return NextResponse.json({ message: "Store access denied." }, { status: 403 });
      result = await db.store.update({ where: { id: data.storeId }, data: { isOpen: data.isOpen, isApproved: data.isApproved, minimumOrderPaise: data.minimumOrderPaise, deliveryFeePaise: data.deliveryFeePaise } });
    } else if (data.action === "createCategory") {
      if (!(await ownsStore(auth.user.id, auth.user.role, data.storeId))) return NextResponse.json({ message: "Store access denied." }, { status: 403 });
      const store = await db.store.findUniqueOrThrow({ where: { id: data.storeId } });
      result = await db.category.create({ data: { storeId: data.storeId, type: store.type, name: data.name, slug: data.slug, imageUrl: data.imageUrl } });
    } else if (data.action === "createProduct") {
      if (!(await ownsStore(auth.user.id, auth.user.role, data.storeId))) return NextResponse.json({ message: "Store access denied." }, { status: 403 });
      if (data.salePricePaise > data.mrpPaise) return NextResponse.json({ message: "Sale price cannot exceed MRP." }, { status: 409 });
      const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
      result = await db.product.create({ data: {
        storeId: data.storeId, categoryId: data.categoryId, name: data.name, slug: data.slug, description: data.description, imageUrl: data.imageUrl, isVeg: data.isVeg,
        variants: { create: { name: data.variantName, unit: data.unit, sku: data.sku, mrpPaise: data.mrpPaise, salePricePaise: data.salePricePaise, stock: data.stock, lowStockAt: data.lowStockAt, expiryDate } }
      } });
    } else if (data.action === "updateProduct") {
      const product = await db.product.findUnique({ where: { id: data.productId } });
      if (!product || !(await ownsStore(auth.user.id, auth.user.role, product.storeId))) return NextResponse.json({ message: "Product access denied." }, { status: 403 });
      result = await db.product.update({ where: { id: data.productId }, data: { name: data.name, imageUrl: data.imageUrl, isActive: data.isActive, isVeg: data.isVeg } });
    } else if (data.action === "createVariant") {
      const product = await db.product.findUnique({ where: { id: data.productId } });
      if (!product || !(await ownsStore(auth.user.id, auth.user.role, product.storeId))) return NextResponse.json({ message: "Product access denied." }, { status: 403 });
      if (data.salePricePaise > data.mrpPaise) return NextResponse.json({ message: "Sale price cannot exceed MRP." }, { status: 409 });
      result = await db.productVariant.create({ data: { productId: data.productId, name: data.name, unit: data.unit, sku: data.sku, mrpPaise: data.mrpPaise, salePricePaise: data.salePricePaise, stock: data.stock, lowStockAt: data.lowStockAt, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null } });
    } else if (data.action === "updateVariant") {
      const variant = await db.productVariant.findUnique({ where: { id: data.variantId }, include: { product: true } });
      if (!variant || !(await ownsStore(auth.user.id, auth.user.role, variant.product.storeId))) return NextResponse.json({ message: "Inventory access denied." }, { status: 403 });
      const mrp = data.mrpPaise ?? variant.mrpPaise;
      const sale = data.salePricePaise ?? variant.salePricePaise;
      if (sale > mrp) return NextResponse.json({ message: "Sale price cannot exceed MRP." }, { status: 409 });
      result = await db.productVariant.update({ where: { id: data.variantId }, data: { mrpPaise: data.mrpPaise, salePricePaise: data.salePricePaise, stock: data.stock, lowStockAt: data.lowStockAt, expiryDate: data.expiryDate === undefined ? undefined : data.expiryDate ? new Date(data.expiryDate) : null, isAvailable: data.isAvailable } });
    } else if (data.action === "createAddon") {
      const product = await db.product.findUnique({ where: { id: data.productId } });
      if (!product || !(await ownsStore(auth.user.id, auth.user.role, product.storeId))) return NextResponse.json({ message: "Product access denied." }, { status: 403 });
      result = await db.foodAddon.create({ data: { productId: data.productId, name: data.name, pricePaise: data.pricePaise } });
    } else if (data.action === "createPincode") {
      result = await db.serviceablePincode.create({ data: { pincode: data.pincode, city: data.city, state: data.state, deliveryFeePaise: data.deliveryFeePaise, minimumOrderPaise: data.minimumOrderPaise } });
    } else if (data.action === "updatePincode") {
      result = await db.serviceablePincode.update({ where: { id: data.id }, data: { deliveryFeePaise: data.deliveryFeePaise, minimumOrderPaise: data.minimumOrderPaise, isActive: data.isActive } });
    } else if (data.action === "createCoupon") {
      if (new Date(data.expiresAt) <= new Date(data.startsAt)) return NextResponse.json({ message: "Coupon expiry must be after its start date." }, { status: 409 });
      result = await db.coupon.create({ data: { code: data.code.toUpperCase(), discountType: data.discountType, discountValue: data.discountValue, maxDiscountPaise: data.maxDiscountPaise, minimumOrderPaise: data.minimumOrderPaise, perUserLimit: data.perUserLimit, startsAt: new Date(data.startsAt), expiresAt: new Date(data.expiresAt) } });
    } else if (data.action === "toggleCoupon") {
      result = await db.coupon.update({ where: { id: data.id }, data: { isActive: data.isActive } });
    } else if (data.action === "createBanner") {
      result = await db.banner.create({ data: { title: data.title, subtitle: data.subtitle, imageUrl: data.imageUrl, linkUrl: data.linkUrl, placement: data.placement } });
    } else if (data.action === "toggleBanner") {
      result = await db.banner.update({ where: { id: data.id }, data: { isActive: data.isActive } });
    } else if (data.action === "updateCommerceSettings") {
      result = await db.siteSetting.upsert({ where: { key: "commerce" }, update: { value: { maintenanceMode: data.maintenanceMode, riderEarningPaise: data.riderEarningPaise, supportEmail: data.supportEmail } }, create: { key: "commerce", value: { maintenanceMode: data.maintenanceMode, riderEarningPaise: data.riderEarningPaise, supportEmail: data.supportEmail } } });
    } else if (data.action === "withdrawalRequest") {
      if (auth.user.role !== "DELIVERY") return NextResponse.json({ message: "Rider access required." }, { status: 403 });
      const balance = await db.riderWalletTransaction.aggregate({ where: { riderId: auth.user.id }, _sum: { amountPaise: true } });
      if ((balance._sum.amountPaise ?? 0) < data.amountPaise) return NextResponse.json({ message: "Withdrawal amount exceeds available earnings." }, { status: 409 });
      result = await db.riderWalletTransaction.create({ data: { riderId: auth.user.id, type: "WITHDRAWAL_REQUEST", amountPaise: -data.amountPaise, note: "Pending Super Admin review" } });
    }

    if (auth.user.role === "SUPER_ADMIN") await recordAdminActivity({ actorId: auth.user.id, action: data.action.toUpperCase(), entityType: "Resource", metadata: { action: data.action } });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "A record with these details already exists." : "The requested change could not be saved.";
    return NextResponse.json({ message }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["SUPER_ADMIN", "RESTAURANT", "GROCERY"]);
  if ("response" in auth) return auth.response;
  const entity = request.nextUrl.searchParams.get("entity");
  const id = request.nextUrl.searchParams.get("id");
  if (!entity || !id) return NextResponse.json({ message: "Entity and ID are required." }, { status: 400 });
  try {
    if (entity === "product") {
      const product = await db.product.findUnique({ where: { id } });
      if (!product || !(await ownsStore(auth.user.id, auth.user.role, product.storeId))) return NextResponse.json({ message: "Product access denied." }, { status: 403 });
      await db.product.delete({ where: { id } });
    } else if (entity === "category") {
      const category = await db.category.findUnique({ where: { id } });
      if (!category?.storeId || !(await ownsStore(auth.user.id, auth.user.role, category.storeId))) return NextResponse.json({ message: "Category access denied." }, { status: 403 });
      await db.category.delete({ where: { id } });
    } else if (entity === "addon") {
      const addon = await db.foodAddon.findUnique({ where: { id }, include: { product: true } });
      if (!addon || !(await ownsStore(auth.user.id, auth.user.role, addon.product.storeId))) return NextResponse.json({ message: "Add-on access denied." }, { status: 403 });
      await db.foodAddon.delete({ where: { id } });
    } else if (entity === "banner" && auth.user.role === "SUPER_ADMIN") await db.banner.delete({ where: { id } });
    else if (entity === "coupon" && auth.user.role === "SUPER_ADMIN") await db.coupon.delete({ where: { id } });
    else return NextResponse.json({ message: "This resource cannot be deleted." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "This record is in use. Deactivate it instead of deleting it." }, { status: 409 });
  }
}
