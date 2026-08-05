import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCatalog } from "@/lib/catalog-service";
import { getCommerceSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  mode: z.enum(["food", "grocery"]).default("grocery"),
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  veg: z.enum(["true", "false"]).optional(),
  storeId: z.string().max(64).optional()
});

export async function GET(request: NextRequest) {
  const settings = await getCommerceSettings();
  if (settings.maintenanceMode) {
    return NextResponse.json({ message: "QuickCart is temporarily under maintenance. Please try again shortly." }, { status: 503 });
  }
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: "Invalid catalog filters." }, { status: 400 });
  const catalog = await getCatalog({
    mode: parsed.data.mode,
    query: parsed.data.q,
    category: parsed.data.category,
    veg: parsed.data.veg === undefined ? undefined : parsed.data.veg === "true",
    storeId: parsed.data.storeId
  });
  return NextResponse.json({ data: catalog }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
