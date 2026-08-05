import "server-only";

import { db } from "@/lib/db";

export type CommerceSettings = {
  maintenanceMode: boolean;
  riderEarningPaise: number;
  supportEmail: string;
};

const defaults: CommerceSettings = {
  maintenanceMode: false,
  riderEarningPaise: 2000,
  supportEmail: "support@example.com"
};

export async function getCommerceSettings(): Promise<CommerceSettings> {
  const setting = await db.siteSetting.findUnique({ where: { key: "commerce" } });
  const value = setting?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  return {
    maintenanceMode: typeof value.maintenanceMode === "boolean" ? value.maintenanceMode : defaults.maintenanceMode,
    riderEarningPaise: typeof value.riderEarningPaise === "number" ? Math.max(0, Math.round(value.riderEarningPaise)) : defaults.riderEarningPaise,
    supportEmail: typeof value.supportEmail === "string" ? value.supportEmail : defaults.supportEmail
  };
}
