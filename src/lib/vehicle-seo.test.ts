import { afterEach, describe, expect, it, vi } from "vitest";
import { vehicleDescription, vehicleMetadata, vehicleStructuredData } from "./vehicle-seo";

const vehicle = {
  id: "car123", year: 2023, trim: "LE", condition: "USED", price: 25000, currency: "USD",
  mileageKm: 42000, transmission: "AUTOMATIC", fuel: "GASOLINE", bodyType: "JEEPETA",
  extColor: "Blanco", description: null, province: "Santiago", status: "ACTIVE",
  model: { name: "RAV4", brand: { name: "Toyota" } }, photos: [{ url: "/uploads/rav4.webp" }],
  dealer: { name: "Autos Santiago", slug: "autos-santiago" }, owner: { name: "Vendedor" },
} as const;
const listing = { ...vehicle, photos: [...vehicle.photos] };

afterEach(() => vi.unstubAllEnvs());

it("generates a specific description even without seller text", () => {
  const description = vehicleDescription(listing);
  expect(description).toContain("Toyota RAV4 2023 LE");
  expect(description).toContain("Santiago, República Dominicana");
  expect(description).toContain("25,000");
  expect(description).toContain("42,000");
  expect(vehicleDescription({ ...listing, description: "<p>Único dueño</p>" })).toContain("Único dueño");
});

it("uses the same listing URL for search, social sharing and structured data", () => {
  vi.stubEnv("SITE_URL", "https://autos.example");
  const url = "https://autos.example/vehiculos/car123/toyota-rav4-2023";
  const metadata = vehicleMetadata(listing);
  expect(metadata.alternates?.canonical).toBe(url);
  expect(metadata.openGraph).toMatchObject({ url, images: [{ url: "https://autos.example/uploads/rav4.webp" }] });
  expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  expect(metadata.description!.length).toBeLessThanOrEqual(160);
  const graph = vehicleStructuredData(listing)!;
  expect(graph["@graph"][0]).toMatchObject({
    "@type": ["Product", "Car"], url, image: ["https://autos.example/uploads/rav4.webp"],
    mileageFromOdometer: { value: 42000, unitCode: "KMT" },
    offers: { price: 25000, priceCurrency: "USD", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/UsedCondition", seller: { "@type": "AutoDealer" } },
  });
});

it("preserves DOP prices, new condition and private sellers", () => {
  expect(vehicleStructuredData({ ...listing, currency: "DOP", price: 1500000, condition: "NEW", mileageKm: 0, dealer: null })!["@graph"][0]).toMatchObject({
    mileageFromOdometer: { value: 0 }, offers: { price: 1500000, priceCurrency: "DOP", itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Person", name: "Vendedor" } },
  });
});

describe("unpublished listings", () => {
  it.each(["DRAFT", "PAUSED", "SOLD"] as const)("excludes %s previews from indexing and structured data", (status) => {
    const privateListing = { ...listing, status };
    expect(vehicleMetadata(privateListing)).toMatchObject({ robots: { index: false }, openGraph: null, twitter: null });
    expect(JSON.stringify(vehicleMetadata(privateListing))).not.toContain("Toyota");
    expect(vehicleStructuredData(privateListing)).toBeNull();
  });
  it("does not index missing listings", () => {
    expect(vehicleMetadata(null).robots).toMatchObject({ index: false });
  });
});
