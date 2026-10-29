import { describe, expect, it } from "vitest";
import { contactRate, dailyCounts } from "./leads";

describe("dailyCounts", () => {
  // 28 oct 2026, 12:00 en Santo Domingo (UTC−4).
  const now = new Date("2026-10-28T16:00:00Z");

  it("fills every day up to today, oldest first", () => {
    const result = dailyCounts([new Date("2026-10-28T13:00:00Z"), new Date("2026-10-28T15:00:00Z"), new Date("2026-10-26T20:00:00Z")], 3, now);
    expect(result).toEqual([
      { day: "2026-10-26", count: 1 },
      { day: "2026-10-27", count: 0 },
      { day: "2026-10-28", count: 2 },
    ]);
  });

  it("buckets by Santo Domingo time, not UTC", () => {
    // 01:30 UTC del 28 = 21:30 del 27 en Santo Domingo.
    expect(dailyCounts([new Date("2026-10-28T01:30:00Z")], 2, now)).toEqual([
      { day: "2026-10-27", count: 1 },
      { day: "2026-10-28", count: 0 },
    ]);
  });
});

describe("contactRate", () => {
  it("is contacts per 100 views", () => {
    expect(contactRate(3, 200)).toBe(1.5);
    expect(contactRate(1, 3)).toBe(33.3);
    expect(contactRate(0, 0)).toBeNull();
  });
});
