export type UserRoleValue =
  | "CUSTOMER"
  | "SUPER_ADMIN"
  | "RESTAURANT"
  | "GROCERY"
  | "DELIVERY";

export type PanelRole = Exclude<UserRoleValue, "CUSTOMER">;

export type SessionPayload = {
  userId: string;
  name: string;
  email?: string;
  role: UserRoleValue;
  expiresAt: string;
};

export type ApiResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
