import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";
import { savedSearchQuery } from "./saved-search";

describe("savedSearchQuery", () => {
  it("keeps only the filters", () => {
    const f = parseSearchParams({ tipo: "jeepeta", marca: "toyota", precioMax: "2000000", orden: "precio-asc", pagina: "3", vista: "mapa", moneda: "usd", ia: "barata" });
    expect(savedSearchQuery(f)).toBe("tipo=jeepeta&marca=toyota&precioMax=2000000");
  });

  it("is empty without filters", () => {
    expect(savedSearchQuery(parseSearchParams({ orden: "km-asc" }))).toBe("");
  });
});
