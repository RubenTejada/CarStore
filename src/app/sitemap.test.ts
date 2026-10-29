import { afterEach, expect, it, vi } from "vitest";
import { resolveSitemap } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";

const { vehicles, dealers } = vi.hoisted(() => ({ vehicles: vi.fn(), dealers: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { vehicle: { findMany: vehicles }, dealer: { findMany: dealers } } }));
import sitemap, { dynamic } from "./sitemap";
import robots from "./robots";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("advertises the public sitemap without blocking listing pages or uploads", () => {
  vi.stubEnv("SITE_URL", "https://autos.example");
  expect(robots()).toEqual({
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/panel", "/api/"] },
    sitemap: "https://autos.example/sitemap.xml",
  });
});

it("discovers newly published cars and removes paused cars on the next sitemap request", async () => {
  vi.stubEnv("SITE_URL", "https://autos.example");
  const car = { id: "newcar", year: 2024, model: { name: "Corolla", brand: { name: "Toyota" } }, photos: [{ url: "/uploads/car.webp" }] };
  vehicles.mockResolvedValueOnce([]).mockResolvedValueOnce([car]).mockResolvedValueOnce([]);
  dealers.mockResolvedValue([{ slug: "autos-santiago" }]);
  expect(dynamic).toBe("force-dynamic");
  expect((await sitemap()).some((entry) => entry.url.includes("newcar"))).toBe(false);
  const published = await sitemap();
  expect(vehicles).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ACTIVE" } }));
  expect(dealers).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "APPROVED" } }));
  expect(published).toContainEqual({ url: "https://autos.example/vehiculos/newcar/toyota-corolla-2024", images: ["https://autos.example/uploads/car.webp"] });
  expect(published).toContainEqual({ url: "https://autos.example/dealers/autos-santiago" });
  expect(published.some((entry) => /login|registro|panel|admin|comparar/.test(entry.url))).toBe(false);
  expect((await sitemap()).some((entry) => entry.url.includes("newcar"))).toBe(false);
});

it("emits XML-safe image URLs through the installed Next.js serializer", async () => {
  vehicles.mockResolvedValue([{ id: "car", year: 2024, model: { name: "Corolla", brand: { name: "Toyota" } }, photos: [{ url: "https://images.unsplash.com/car.jpg?auto=format&fit=crop&w=1600" }] }]);
  dealers.mockResolvedValue([]);
  const xml = resolveSitemap(await sitemap());
  expect(xml).toContain("https://images.unsplash.com/car.jpg?auto=format&amp;fit=crop&amp;w=1600");
  expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
});
