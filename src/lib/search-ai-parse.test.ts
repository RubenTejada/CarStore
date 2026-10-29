import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiSearch, applyAiSearch, type AiCatalog } from "./search-ai-parse";

const catalog: AiCatalog = {
  brands: [
    { slug: "toyota", name: "Toyota", models: [{ slug: "rav4", name: "RAV4" }, { slug: "corolla", name: "Corolla" }] },
    { slug: "honda", name: "Honda", models: [{ slug: "cr-v", name: "CR-V" }] },
  ],
  features: [{ slug: "camara-reversa", name: "Cámara de reversa" }],
  provinces: ["Santiago", "Distrito Nacional"],
};

const empty: AiSearch = {
  understood: true,
  condicion: "",
  tipo: "",
  marca: "",
  modelo: "",
  precioMin: 0,
  precioMax: 0,
  anioMin: 0,
  anioMax: 0,
  kmMax: 0,
  transmision: "",
  combustible: "",
  traccion: "",
  provincia: "",
  color: "",
  car: [],
  orden: "",
};

describe("applyAiSearch", () => {
  it("adds the understood filters and keeps the current ones without q", () => {
    const out = applyAiSearch({ q: "familiar barata santiago", tipo: "jeepeta", vista: "mapa" }, { ...empty, precioMax: 1_500_000, provincia: "santiago", orden: "precio-asc" }, catalog, "familiar barata santiago");
    expect(out).toEqual({ tipo: "jeepeta", vista: "mapa", precioMax: "1500000", provincia: "Santiago", orden: "precio-asc", ia: "familiar barata santiago" });
  });

  it("drops brands, models, provinces and features outside the catalog", () => {
    const out = applyAiSearch({ q: "x" }, { ...empty, marca: "ferrari", modelo: "rav4", provincia: "Narnia", car: ["camara-reversa", "jetpack"], combustible: "hybrid" }, catalog, "x");
    expect(out).toEqual({ car: "camara-reversa", combustible: "hybrid", ia: "x" });
  });

  it("only accepts a model of the chosen brand and clears dependent filters on a new brand", () => {
    expect(applyAiSearch({ marca: "toyota", modelo: "corolla", version: "le" }, { ...empty, marca: "honda", modelo: "cr-v" }, catalog, "crv")).toEqual({ marca: "honda", modelo: "cr-v", ia: "crv" });
    expect(applyAiSearch({ marca: "toyota" }, { ...empty, modelo: "cr-v", anioMin: 1800 }, catalog, "z")).toBeNull();
  });

  it("returns null when nothing was understood or nothing changes", () => {
    expect(applyAiSearch({ q: "hola" }, { ...empty, understood: false, tipo: "sedan" }, catalog, "hola")).toBeNull();
    expect(applyAiSearch({ tipo: "sedan", q: "sedan" }, { ...empty, tipo: "sedan" }, catalog, "sedan")).toBeNull();
  });
});

describe("AiSearch", () => {
  it("has no union-typed fields (the API limits them)", () => {
    const props = Object.values((z.toJSONSchema(AiSearch) as { properties: Record<string, { anyOf?: unknown; type?: unknown }> }).properties);
    expect(props.filter((p) => p.anyOf || Array.isArray(p.type))).toHaveLength(0);
  });
});
