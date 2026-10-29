import { describe, expect, it } from "vitest";
import { marbeteFor, purchaseCosts } from "./purchase-cost";

describe("purchaseCosts", () => {
  it("adds transfer tax, registration and marbete for used vehicles", () => {
    const lines = purchaseCosts({ condition: "USED", year: 2019, priceDop: 1_000_000 });
    expect(lines.map((l) => l.amount)).toEqual([20_000, 100, 1_500]);
  });

  it("charges the higher marbete for recent model years", () => {
    expect(marbeteFor(2021)).toBe(3_000);
    expect(marbeteFor(2020)).toBe(1_500);
  });

  it("has no transfer costs for new vehicles", () => {
    expect(purchaseCosts({ condition: "NEW", year: 2026, priceDop: 2_000_000 })).toEqual([]);
  });
});
