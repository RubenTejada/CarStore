import { describe, expect, it } from "vitest";
import { takeToken } from "./rate-limit";

describe("takeToken", () => {
  it("allows up to the limit per window, then resets", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => takeToken("ip-a", 2, 60_000, t))).toEqual([true, true, false]);
    expect(takeToken("ip-b", 2, 60_000, t)).toBe(true);
    expect(takeToken("ip-a", 2, 60_000, t + 60_000)).toBe(true);
  });
});
