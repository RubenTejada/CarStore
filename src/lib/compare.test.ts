import { describe, expect, it } from "vitest";
import { bestIndices, compareUrl, parseCompareIds, parseCompareItems } from "./compare";

describe("parseCompareIds", () => {
  it("keeps valid unique ids up to three", () => {
    expect(parseCompareIds("a1,b2,a1,c3,d4")).toEqual(["a1", "b2", "c3"]);
    expect(parseCompareIds(["a1", "b2"])).toEqual(["a1", "b2"]);
  });

  it("drops junk", () => {
    expect(parseCompareIds(" a1 ,,<x>,b2")).toEqual(["a1", "b2"]);
    expect(parseCompareIds(undefined)).toEqual([]);
  });
});

describe("compareUrl", () => {
  it("builds readable query strings", () => {
    expect(compareUrl(["a1", "b2"])).toBe("/comparar?ids=a1,b2");
    expect(compareUrl(["a1"], true)).toBe("/comparar?ids=a1&dif=1");
    expect(compareUrl([])).toBe("/comparar?ids=");
  });
});

describe("bestIndices", () => {
  it("marks every tie for best", () => {
    expect(bestIndices([300, 100, 100], "min")).toEqual([1, 2]);
    expect(bestIndices([2020, null, 2024], "max")).toEqual([2]);
  });

  it("returns nothing when all equal or alone", () => {
    expect(bestIndices([5, 5], "min")).toEqual([]);
    expect(bestIndices([5, null], "min")).toEqual([]);
  });
});

describe("parseCompareItems", () => {
  it("accepts well-formed items only", () => {
    const raw = JSON.stringify([{ id: "a1", title: "Kia K5", year: 2022 }, { id: "b2", title: 3 }, null]);
    expect(parseCompareItems(raw)).toEqual([{ id: "a1", title: "Kia K5", year: 2022 }]);
    expect(parseCompareItems("{oops")).toEqual([]);
    expect(parseCompareItems(null)).toEqual([]);
  });
});
