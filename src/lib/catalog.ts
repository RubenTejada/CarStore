import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getBrandLogo } from "@/lib/brand-logos";
import { INVENTORY_TAG, INVENTORY_TTL_SECONDS } from "@/lib/inventory-cache";
import type { BodyType, Condition, Fuel, Transmission } from "@/generated/prisma/enums";
import type { SearchIndex } from "@/lib/search-suggest";

/** Vehículos publicados de un modelo para una combinación de filtros del buscador principal. */
export type StockRow = { bodyType: BodyType; condition: Condition; fuel: Fuel; transmission: Transmission; n: number };

/**
 * Catálogo para la navegación gráfica: marcas con logo y modelos,
 * con el conteo de vehículos publicados por carrocería, condición, combustible y transmisión.
 */
async function loadBrowseCatalog() {
  const [brands, counts] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, include: { models: { orderBy: { name: "asc" } } } }),
    db.vehicle.groupBy({
      by: ["modelId", "bodyType", "condition", "fuel", "transmission"],
      where: { status: "ACTIVE" },
      _count: true,
    }),
  ]);
  const byModel = new Map<string, StockRow[]>();
  for (const { modelId, _count, ...dims } of counts) {
    const rows = byModel.get(modelId) ?? [];
    rows.push({ ...dims, n: _count });
    byModel.set(modelId, rows);
  }
  return brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    color: b.color,
    logo: getBrandLogo(b.iconSlug),
    models: b.models.map((m) => ({ slug: m.slug, name: m.name, bodyType: m.bodyType, stock: byModel.get(m.id) ?? [] })),
  }));
}

/** Cacheado: se invalida con la etiqueta del inventario (y cada INVENTORY_TTL_SECONDS). */
export const getBrowseCatalog = unstable_cache(loadBrowseCatalog, ["browse-catalog-v1"], {
  tags: [INVENTORY_TAG],
  revalidate: INVENTORY_TTL_SECONDS,
});

export type BrowseBrand = Awaited<ReturnType<typeof getBrowseCatalog>>[number];

/**
 * Índice del autocompletado (ver search-suggest.ts): solo marcas, modelos y versiones con vehículos
 * publicados, y el stock por modelo, versión, carrocería, condición, combustible, transmisión, tracción y año.
 */
async function loadSearchIndex(): Promise<SearchIndex> {
  const [brands, stock] = await Promise.all([
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        color: true,
        iconSlug: true,
        models: { orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, bodyType: true, trims: { orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } } } },
      },
    }),
    db.vehicle.groupBy({
      by: ["modelId", "trimId", "bodyType", "condition", "fuel", "transmission", "drivetrain", "year"],
      where: { status: "ACTIVE" },
      _count: true,
    }),
  ]);
  const withStock = new Set(stock.flatMap((r) => [r.modelId, r.trimId]));
  const index: SearchIndex = { brands: [], models: [], trims: [], stock: [] };
  const modelPos = new Map<string, number>();
  const trimPos = new Map<string, number>();
  for (const b of brands) {
    const models = b.models.filter((m) => withStock.has(m.id));
    if (!models.length) continue;
    const brand = index.brands.push({ slug: b.slug, name: b.name, color: b.color, logo: getBrandLogo(b.iconSlug) }) - 1;
    for (const m of models) {
      const model = index.models.push({ slug: m.slug, name: m.name, brand, bodyType: m.bodyType }) - 1;
      modelPos.set(m.id, model);
      for (const t of m.trims) if (withStock.has(t.id)) trimPos.set(t.id, index.trims.push({ slug: t.slug, name: t.name, model }) - 1);
    }
  }
  for (const r of stock)
    index.stock.push([modelPos.get(r.modelId)!, r.trimId ? (trimPos.get(r.trimId) ?? -1) : -1, r.bodyType, r.condition, r.fuel, r.transmission, r.drivetrain, r.year, r._count]);
  return index;
}

export const getSearchIndex = unstable_cache(loadSearchIndex, ["search-index-v2"], {
  tags: [INVENTORY_TAG],
  revalidate: INVENTORY_TTL_SECONDS,
});
