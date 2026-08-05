import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySessionToken } from "@/lib/session";
import type { UserRoleValue } from "@/lib/types";

export async function authorizeApi(roles: UserRoleValue[]) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(sessionCookie.name)?.value);
  if (!session) {
    return { response: NextResponse.json({ message: "Authentication required." }, { status: 401 }) } as const;
  }
  if (!roles.includes(session.role)) {
    return { response: NextResponse.json({ message: "You do not have permission for this action." }, { status: 403 }) } as const;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true }
  });
  if (!user?.isActive || user.role !== session.role) {
    return { response: NextResponse.json({ message: "Account access is unavailable." }, { status: 401 }) } as const;
  }
  return { session, user } as const;
}

export async function recordAdminActivity(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: object;
  ipAddress?: string;
}) {
  await db.adminActivityLog.create({ data: input });
}
