import { beforeAll, describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./crypto";

beforeAll(() => {
  process.env.SOCIAL_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("sealSecret", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = sealSecret("EAAB-token");
    expect(a).not.toBe(sealSecret("EAAB-token"));
    expect(openSecret(a)).toBe("EAAB-token");
  });

  it("rejects tampered data", () => {
    const [v, iv, tag, data] = sealSecret("secreto").split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 1;
    expect(() => openSecret([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });
});
