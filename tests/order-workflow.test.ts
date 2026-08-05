import assert from "node:assert/strict";
import test from "node:test";
import { canCancelOrder, isValidOrderTransition, nextStoreStatus } from "../src/lib/order-workflow";

test("food workflow advances in order", () => {
  assert.equal(isValidOrderTransition("FOOD", "CONFIRMED", "PREPARING"), true);
  assert.equal(isValidOrderTransition("FOOD", "CONFIRMED", "PACKING"), false);
});

test("grocery workflow uses packing", () => {
  assert.equal(nextStoreStatus("GROCERY", "CONFIRMED"), "PACKING");
});

test("cancellation respects the cutoff", () => {
  assert.equal(canCancelOrder("ACCEPTED"), true);
  assert.equal(canCancelOrder("CONFIRMED"), false);
});
