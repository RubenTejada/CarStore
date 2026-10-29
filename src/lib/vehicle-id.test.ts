import { describe, expect, it } from "vitest";
import { normalizePlate, normalizeVin } from "./vehicle-id";

describe("normalizePlate", () => {
  it("compacts and uppercases Dominican plates", () => {
    expect(normalizePlate(" a-123 456 ")).toBe("A123456");
    expect(normalizePlate("G012345")).toBe("G012345");
    expect(normalizePlate("EX12345")).toBe("EX12345");
  });

  it("returns null when empty and undefined when invalid", () => {
    expect(normalizePlate("  ")).toBeNull();
    expect(normalizePlate("123456")).toBeUndefined();
    expect(normalizePlate("ABC1234567")).toBeUndefined();
  });
});

describe("normalizeVin", () => {
  it("accepts 17-character VINs", () => {
    expect(normalizeVin("1hgcm82633a 004352")).toBe("1HGCM82633A004352");
  });

  it("rejects wrong length or forbidden letters", () => {
    expect(normalizeVin("")).toBeNull();
    expect(normalizeVin("1HGCM82633A00435")).toBeUndefined();
    expect(normalizeVin("1HGCM82633O004352")).toBeUndefined();
  });
});
