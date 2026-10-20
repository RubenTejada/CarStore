import { describe, expect, it } from "vitest";
import { buildOrderBy, buildWhere, parseSearchParams, toQueryString } from "./search-params";

describe("parseSearchParams", () => {
  it("parses valid filters and normalizes enums", () => {
    const f = parseSearchParams({ tipo: "jeepeta", condicion: "nuevo", marca: "toyota", precioMax: "2000000", transmision: "automatic", car: "bluetooth,camara-de-reversa" });
    expect(f).toMatchObject({ tipo: "JEEPETA", condicion: "NEW", marca: "toyota", precioMax: 2_000_000, transmision: "AUTOMATIC", car: ["bluetooth", "camara-de-reversa"] });
  });

  it("drops invalid values instead of failing", () => {
    const f = parseSearchParams({ tipo: "tanque", marca: "Toyota'; drop", precioMin: "-5", orden: "hack", pagina: "0", car: "ok,<script>" });
    expect(f.tipo).toBeUndefined();
    expect(f.marca).toBeUndefined();
    expect(f.precioMin).toBeUndefined();
    expect(f.orden).toBeUndefined();
    expect(f.pagina).toBeUndefined();
    expect(f.car).toEqual(["ok"]);
  });

  it("joins repeated checkbox params", () => {
    expect(parseSearchParams({ car: ["a", "b"] }).car).toEqual(["a", "b"]);
  });

  it("round-trips through toQueryString", () => {
    const raw = { tipo: "pickup", condicion: "usado", marca: "ford", modelo: "f-150", car: "bluetooth" };
    const f = parseSearchParams(raw);
    const again = parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(f).slice(1))));
    expect(again).toEqual(f);
    expect(toQueryString(f, { modelo: undefined })).not.toContain("modelo");
  });
});

describe("buildWhere", () => {
  it("always restricts to active vehicles", () => {
    expect(buildWhere({})).toEqual({ AND: [{ status: "ACTIVE" }] });
  });

  it("omits a dimension for facet counts", () => {
    const f = parseSearchParams({ tipo: "sedan", marca: "honda" });
    const where = JSON.stringify(buildWhere(f, "tipo"));
    expect(where).not.toContain("SEDAN");
    expect(where).toContain("honda");
  });

  it("filters by trim only inside a model", () => {
    const withModel = JSON.stringify(buildWhere(parseSearchParams({ marca: "kia", modelo: "sorento", version: "sx" })));
    expect(withModel).toContain('"catalogTrim":{"slug":"sx"}');
    expect(JSON.stringify(buildWhere(parseSearchParams({ marca: "kia", version: "sx" })))).not.toContain("catalogTrim");
    const facet = JSON.stringify(buildWhere(parseSearchParams({ marca: "kia", modelo: "sorento", version: "sx" }), "version"));
    expect(facet).toContain("sorento");
    expect(facet).not.toContain("catalogTrim");
  });

  it("requires every selected feature", () => {
    const where = buildWhere(parseSearchParams({ car: "a,b" }));
    expect((where.AND as unknown[]).length).toBe(3);
  });

  it("matches a 4-digit word as year", () => {
    expect(JSON.stringify(buildWhere(parseSearchParams({ q: "corolla 2020" })))).toContain('"year":2020');
  });
});

describe("buildOrderBy", () => {
  it("defaults to newest", () => {
    expect(buildOrderBy(undefined)).toEqual([{ createdAt: "desc" }]);
    expect(buildOrderBy("precio-asc")).toEqual([{ priceDop: "asc" }]);
  });
});
