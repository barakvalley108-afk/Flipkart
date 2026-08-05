import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";

export async function GET() {
  const auth = await authorizeApi(["CUSTOMER", "SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const notifications = await db.notification.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ data: notifications });
}

export async function PATCH(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const auth = await authorizeApi(["CUSTOMER", "SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  if ("response" in auth) return auth.response;
  const parsed = z.object({ id: z.string().optional(), all: z.boolean().optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) return NextResponse.json({ message: "Notification selection is required." }, { status: 400 });
  await db.notification.updateMany({ where: { userId: auth.user.id, ...(parsed.data.id ? { id: parsed.data.id } : {}) }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
