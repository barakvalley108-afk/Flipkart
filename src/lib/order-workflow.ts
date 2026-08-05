export type WorkflowOrderType = "FOOD" | "GROCERY";

export const terminalStatuses = ["DELIVERED", "CANCELLED", "REFUNDED"] as const;

export const orderFlows = {
  FOOD: [
    "PLACED",
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "OUT_FOR_DELIVERY",
    "DELIVERED"
  ],
  GROCERY: [
    "PLACED",
    "ACCEPTED",
    "CONFIRMED",
    "PACKING",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "OUT_FOR_DELIVERY",
    "DELIVERED"
  ]
} as const;

export function canCancelOrder(status: string) {
  return ["PLACED", "ACCEPTED"].includes(status);
}

export function isValidOrderTransition(
  type: WorkflowOrderType,
  current: string,
  next: string
) {
  if (current === next) return true;
  if (next === "CANCELLED") return canCancelOrder(current);
  if (current === "CANCELLED" && next === "REFUND_PENDING") return true;
  if (current === "REFUND_PENDING" && next === "REFUNDED") return true;
  const flow = orderFlows[type];
  return flow.indexOf(current as never) + 1 === flow.indexOf(next as never);
}

export function nextStoreStatus(type: WorkflowOrderType, status: string) {
  const allowed = type === "FOOD"
    ? ["PLACED", "ACCEPTED", "CONFIRMED", "PREPARING"]
    : ["PLACED", "ACCEPTED", "CONFIRMED", "PACKING"];
  if (!allowed.includes(status)) return null;
  const flow = orderFlows[type];
  return flow[flow.indexOf(status as never) + 1] ?? null;
}
