import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getBrandLogo } from "@/lib/brand-logos";
import { INVENTORY_TAG, INVENTORY_TTL_SECONDS } from "@/lib/inventory-cache";
import type { BodyType, Condition, Fuel, Transmission } from "@/generated/prisma/enums";

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
