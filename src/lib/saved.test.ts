import { describe, expect, it } from "vitest";
import { cleanIds, parseIdList, pushRecent } from "./saved";

describe("parseIdList", () => {
  it("keeps valid unique ids in order", () => {
    expect(parseIdList('["b2","a1","b2"]', 10)).toEqual(["b2", "a1"]);
  });

  it("drops junk and caps the list", () => {
    expect(parseIdList('["a1",3,"<x>",null,"c3"]', 10)).toEqual(["a1", "c3"]);
    expect(parseIdList('["a1","b2","c3"]', 2)).toEqual(["a1", "b2"]);
    expect(parseIdList("{}", 10)).toEqual([]);
    expect(parseIdList("not json", 10)).toEqual([]);
    expect(parseIdList(null, 10)).toEqual([]);
  });
});

describe("cleanIds", () => {
  it("accepts query values", () => {
    expect(cleanIds("a1,,b2, c3".split(","), 5)).toEqual(["a1", "b2"]);
  });
});

describe("pushRecent", () => {
  it("moves the viewed id to the front without duplicates", () => {
    expect(pushRecent(["a1", "b2", "c3"], "b2")).toEqual(["b2", "a1", "c3"]);
    expect(pushRecent(["a1", "b2"], "c3", 2)).toEqual(["c3", "a1"]);
  });
});
