import { afterEach, describe, expect, it, vi } from "vitest";
import { browseMetadata, pageMetadata, serializeJsonLd, siteUrl } from "./seo";

afterEach(() => vi.unstubAllEnvs());

describe("canonical URLs", () => {
  it("uses the configured public origin for local photos and pages", () => {
    vi.stubEnv("SITE_URL", "https://autos.example/");
    expect(siteUrl("/vehiculos")).toBe("https://autos.example/vehiculos");
    expect(siteUrl("/uploads/car.webp")).toBe("https://autos.example/uploads/car.webp");
    expect(siteUrl("https://images.unsplash.com/car.jpg")).toBe("https://images.unsplash.com/car.jpg");
    const metadata = pageMetadata({ path: "/vehiculos", title: "Carros", description: "En venta", images: ["/uploads/car.webp"] });
    expect(metadata.alternates?.canonical).toBe("https://autos.example/vehiculos");
    expect(metadata.openGraph).toMatchObject({ url: "https://autos.example/vehiculos", images: [{ url: "https://autos.example/uploads/car.webp", alt: "Carros" }] });
  });
});

describe("browse indexing", () => {
  it("indexes the catalogue and useful categories with separate canonical pagination", () => {
    vi.stubEnv("SITE_URL", "https://autos.example");
    expect(browseMetadata("/vehiculos", {}, "Carros", "En venta").robots).toMatchObject({ index: true });
    const category = browseMetadata("/vehiculos", { marca: "toyota", pagina: "2" }, "Toyota", "En venta");
    expect(category.robots).toMatchObject({ index: true, follow: true });
    expect(category.alternates?.canonical).toBe("https://autos.example/vehiculos?marca=toyota&pagina=2");
    expect(category.title).toBe("Toyota — Página 2");
    expect(browseMetadata("/vehiculos", { pagina: "1" }, "Carros", "En venta").alternates?.canonical).toBe("https://autos.example/vehiculos");
  });

  it.each([{ q: "jeepeta bonita" }, { precioMax: "1000000" }, { vista: "mapa" }, { orden: "precio-asc" }])("keeps search variants out of the index while allowing link discovery: %j", (raw) => {
    expect(browseMetadata("/vehiculos", raw, "Carros", "En venta").robots).toEqual({ index: false, follow: true });
  });
});

it("keeps seller-supplied script terminators inside JSON-LD data", () => {
  const data = { description: '</script><script>alert("seller")</script>' };
  const serialized = serializeJsonLd(data);
  expect(serialized).not.toContain("<");
  expect(JSON.parse(serialized)).toEqual(data);
});
