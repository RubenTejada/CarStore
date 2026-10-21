import { describe, expect, it } from "vitest";
import { priceHistogram, yearHistogram } from "./histogram";

const total = (counts: number[]) => counts.reduce((a, b) => a + b, 0);

describe("priceHistogram", () => {
  it("uses round steps and keeps every vehicle", () => {
    const values = Array.from({ length: 100 }, (_, i) => ({ value: 500_000 + i * 30_000, count: 1 }));
    const h = priceHistogram(values)!;
    expect(h.start).toBe(500_000);
    expect(h.step).toBe(100_000);
    expect(total(h.counts)).toBe(100);
  });

  it("lumps the expensive tail into the last bar", () => {
    const values = [...Array.from({ length: 99 }, (_, i) => ({ value: 1_000_000 + i * 10_000, count: 1 })), { value: 50_000_000, count: 1 }];
    const h = priceHistogram(values)!;
    expect(h.start + h.counts.length * h.step).toBeLessThan(3_000_000);
    expect(h.counts.at(-1)).toBeGreaterThanOrEqual(1);
    expect(h.openEnd).toBe(true);
    expect(total(h.counts)).toBe(100);
  });

  it("handles a single price and empty input", () => {
    expect(priceHistogram([])).toBeNull();
    expect(priceHistogram([{ value: 1_200_000, count: 3 }])!.counts).toEqual([3]);
  });
});

describe("yearHistogram", () => {
  it("has one bar per year", () => {
    const h = yearHistogram([
      { value: 2018, count: 2 },
      { value: 2020, count: 1 },
    ])!;
    expect(h).toEqual({ start: 2018, step: 1, counts: [2, 0, 1], openStart: false, openEnd: false });
  });

  it("lumps old years into the first bar", () => {
    const h = yearHistogram([
      { value: 1985, count: 1 },
      { value: 2024, count: 1 },
    ], 10)!;
    expect(h.start).toBe(2015);
    expect(h.counts[0]).toBe(1);
    expect(h.openStart).toBe(true);
    expect(h.counts.length).toBe(10);
  });
});
