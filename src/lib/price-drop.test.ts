import { describe, expect, it } from "vitest";
import { nextPriceDrop, priceDrop } from "./price-drop";

const now = new Date("2026-10-28T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const listed = { price: 1_000_000, currency: "DOP" as const, priceBefore: null, priceDropAt: null };

describe("nextPriceDrop", () => {
  it("starts a drop from the previous price", () => {
    expect(nextPriceDrop(listed, { price: 900_000, currency: "DOP" }, now)).toEqual({ priceBefore: 1_000_000, priceDropAt: now });
  });

  it("accumulates drops within the badge window", () => {
    const dropped = { price: 900_000, currency: "DOP" as const, priceBefore: 1_000_000, priceDropAt: daysAgo(5) };
    expect(nextPriceDrop(dropped, { price: 850_000, currency: "DOP" }, now)).toEqual({ priceBefore: 1_000_000, priceDropAt: now });
  });

  it("starts over after the window expires", () => {
    const old = { price: 900_000, currency: "DOP" as const, priceBefore: 1_000_000, priceDropAt: daysAgo(40) };
    expect(nextPriceDrop(old, { price: 850_000, currency: "DOP" }, now)).toEqual({ priceBefore: 900_000, priceDropAt: now });
  });

  it("keeps the state when the price does not change", () => {
    const dropped = { price: 900_000, currency: "DOP" as const, priceBefore: 1_000_000, priceDropAt: daysAgo(5) };
    expect(nextPriceDrop(dropped, { price: 900_000, currency: "DOP" }, now)).toEqual({ priceBefore: 1_000_000, priceDropAt: daysAgo(5) });
  });

  it("cancels on a raise or a currency change", () => {
    const dropped = { price: 900_000, currency: "DOP" as const, priceBefore: 1_000_000, priceDropAt: daysAgo(5) };
    expect(nextPriceDrop(dropped, { price: 950_000, currency: "DOP" }, now)).toEqual({ priceBefore: null, priceDropAt: null });
    expect(nextPriceDrop(dropped, { price: 15_000, currency: "USD" }, now)).toEqual({ priceBefore: null, priceDropAt: null });
  });
});

describe("priceDrop", () => {
  it("returns the amount while the drop is recent", () => {
    expect(priceDrop({ price: 900_000, priceBefore: 1_000_000, priceDropAt: daysAgo(3) }, now)).toBe(100_000);
    expect(priceDrop({ price: 900_000, priceBefore: 1_000_000, priceDropAt: daysAgo(3).toISOString() }, now)).toBe(100_000);
  });

  it("ignores old or missing drops", () => {
    expect(priceDrop({ price: 900_000, priceBefore: 1_000_000, priceDropAt: daysAgo(31) }, now)).toBeNull();
    expect(priceDrop({ price: 900_000, priceBefore: null, priceDropAt: null }, now)).toBeNull();
    expect(priceDrop({ price: 1_000_000, priceBefore: 900_000, priceDropAt: daysAgo(1) }, now)).toBeNull();
  });
});
