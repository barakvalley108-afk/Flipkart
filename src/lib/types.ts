export type PanelRole =
  | "SUPER_ADMIN"
  | "RESTAURANT"
  | "GROCERY"
  | "DELIVERY";

export type SessionPayload = {
  email: string;
  role: PanelRole;
  expiresAt: string;
};
