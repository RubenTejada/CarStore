import { describe, expect, it } from "vitest";
import { applyPicked, parseQuery, prepareIndex, resolveFreeText, suggest, type SearchIndex } from "./search-suggest";

const index: SearchIndex = {
  brands: [
    { slug: "toyota", name: "Toyota", color: null, logo: null },
    { slug: "honda", name: "Honda", color: null, logo: null },
    { slug: "land-rover", name: "Land Rover", color: null, logo: null },
    { slug: "ford", name: "Ford", color: null, logo: null },
  ],
  models: [
    { slug: "corolla", name: "Corolla", brand: 0, bodyType: "SEDAN" },
    { slug: "rav4", name: "RAV4", brand: 0, bodyType: "JEEPETA" },
    { slug: "cr-v", name: "CR-V", brand: 1, bodyType: "JEEPETA" },
    { slug: "range-rover-sport", name: "Range Rover Sport", brand: 2, bodyType: "JEEPETA" },
    { slug: "f-150", name: "F-150", brand: 3, bodyType: "PICKUP" },
  ],
  trims: [
    { slug: "le", name: "LE", model: 0 },
    { slug: "limited", name: "Limited", model: 1 },
    { slug: "touring", name: "Touring", model: 2 },
  ],
  stock: [
    [0, 0, "SEDAN", "USED", "GASOLINE", "AUTOMATIC", "FWD", 2020, 3],
    [0, -1, "SEDAN", "NEW", "HYBRID", "CVT", "FWD", 2025, 2],
    [1, 1, "JEEPETA", "USED", "DIESEL", "AUTOMATIC", "FOUR_WD", 2019, 1],
    [1, -1, "JEEPETA", "NEW", "HYBRID", "AUTOMATIC", "AWD", 2025, 4],
    [2, 2, "JEEPETA", "USED", "GASOLINE", "CVT", "AWD", 2021, 2],
    [3, -1, "JEEPETA", "USED", "GASOLINE", "AUTOMATIC", "AWD", 2018, 1],
    [4, -1, "PICKUP", "USED", "GASOLINE", "AUTOMATIC", "FOUR_WD", 2022, 5],
  ],
};
const ix = prepareIndex(index);
const first = (q: string, params?: Record<string, string>) => suggest(ix, q, params)[0];

describe("parseQuery", () => {
  it("recognizes every filter kind, multi-word names and year ranges", () => {
    expect(parseQuery(ix, "jeepetas toyota usadas diesel 4x4 2018 2020 ").picked).toEqual({
      tipo: "JEEPETA",
      marca: "toyota",
      condicion: "USED",
      combustible: "DIESEL",
      traccion: "FOUR_WD",
      anioMin: 2018,
      anioMax: 2020,
    });
    expect(parseQuery(ix, "land rover ").picked).toEqual({ marca: "land-rover" });
    expect(parseQuery(ix, "f 150 ").picked).toEqual({ marca: "ford", modelo: "f-150" });
  });

  it("only takes a trim once its model is known, in any order", () => {
    expect(parseQuery(ix, "limited rav4 ").picked).toEqual({ marca: "toyota", modelo: "rav4", version: "limited" });
  });

  it("forgives typos and accents, ignores filler words", () => {
    expect(parseQuery(ix, "toyta corola ").picked).toEqual({ marca: "toyota", modelo: "corolla" });
    expect(parseQuery(ix, "híbrido del año 2025 ").picked).toEqual({ combustible: "HYBRID", anioMin: 2025, anioMax: 2025 });
  });

  it("leaves the word being typed (and trailing unknown words) to be completed", () => {
    expect(parseQuery(ix, "toyota cor")).toEqual({ picked: { marca: "toyota" }, tail: ["cor"], unmatched: [] });
    expect(parseQuery(ix, "range rover sp").tail).toEqual(["range", "rover", "sp"]);
  });
});

describe("suggest", () => {
  it("completes the last word within what is already recognized", () => {
    expect(first("toyota cor")).toMatchObject({ kind: "model", title: "Toyota Corolla", count: 5, href: "/vehiculos?marca=toyota&modelo=corolla" });
    expect(first("range rover sp")).toMatchObject({ title: "Land Rover Range Rover Sport" });
    expect(first("crv")).toMatchObject({ title: "Honda CR-V" });
    expect(first("corola")).toMatchObject({ title: "Toyota Corolla" });
  });

  it("expands the best match into its models, then ends with free text", () => {
    const s = suggest(ix, "toyo");
    expect(s.map((x) => x.title)).toEqual(["Toyota", "Toyota Corolla", "Toyota RAV4", "toyo"]);
    expect(s.at(-1)).toMatchObject({ kind: "text", href: "/vehiculos?q=toyo" });
  });

  it("counts exactly and drops combinations without stock", () => {
    expect(first("toyota usado ")).toMatchObject({ title: "Toyota", meta: ["Usados"], count: 4 });
    expect(suggest(ix, "honda diesel ").map((x) => x.kind)).toEqual(["text"]);
  });

  it("only falls back to look-alikes when nothing matches for real", () => {
    // "toyot" se parece a "todot(erreno)", pero Toyota ya coincide.
    expect(suggest(ix, "toyot").map((x) => x.kind)).not.toContain("type");
    // Una versión por parecido exige su modelo: "touing" solo no es el CR-V Touring.
    expect(suggest(ix, "touing").map((x) => x.kind)).toEqual(["text"]);
    expect(first("cr-v touing")).toMatchObject({ kind: "trim", title: "Honda CR-V Touring" });
  });

  it("finds trims without a model from 3 letters", () => {
    expect(first("limi")).toMatchObject({ kind: "trim", title: "Toyota RAV4 Limited", href: "/vehiculos?marca=toyota&modelo=rav4&version=limited" });
  });

  it("keeps current filters, and what is typed overrides them", () => {
    const params = { tipo: "jeepeta", condicion: "usado", precioMax: "2000000", orden: "precio-asc" };
    const s = first("corolla", params);
    // El modelo define la carrocería: se descarta "jeepeta" y se conservan condición, precio y orden.
    expect(s.href).toBe("/vehiculos?condicion=usado&marca=toyota&modelo=corolla&precioMax=2000000&orden=precio-asc");
    // Con un filtro que el índice no cuenta (precio), no se muestra conteo.
    expect(s.count).toBeNull();
    expect(first("corolla", { condicion: "usado" }).count).toBe(3);
  });

  it("suggests the models with most stock for an empty query", () => {
    expect(suggest(ix, "").map((x) => x.title)).toEqual(["Toyota Corolla", "Toyota RAV4", "Ford F-150", "Honda CR-V", "Land Rover Range Rover Sport"]);
  });
});

describe("resolveFreeText", () => {
  it("turns submitted text into filters and keeps only unknown words as q", () => {
    expect(resolveFreeText(ix, { q: "jeepeta toyota 2019" })).toBe("/vehiculos?tipo=jeepeta&marca=toyota&anioMin=2019&anioMax=2019");
    expect(resolveFreeText(ix, { q: "honda crv blanca", condicion: "usado", orden: "precio-asc" })).toBe(
      "/vehiculos?q=blanca&condicion=usado&marca=honda&modelo=cr-v&orden=precio-asc",
    );
  });

  it("leaves text it cannot read as is", () => {
    expect(resolveFreeText(ix, { q: "mitsubishi l200" })).toBeNull();
    expect(resolveFreeText(ix, { marca: "toyota" })).toBeNull();
  });
});

describe("applyPicked", () => {
  it("drops filters that depended on a replaced brand or model", () => {
    expect(applyPicked({ marca: "honda", modelo: "cr-v", version: "touring" }, { marca: "toyota" })).toEqual({ marca: "toyota" });
    expect(applyPicked({ marca: "toyota", modelo: "rav4", version: "limited" }, { marca: "toyota", modelo: "corolla" })).toEqual({ marca: "toyota", modelo: "corolla" });
  });
});
