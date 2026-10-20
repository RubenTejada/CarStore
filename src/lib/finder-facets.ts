import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { buildWhere, type SearchFilters } from "@/lib/search-params";
import { INVENTORY_TAG, INVENTORY_TTL_SECONDS } from "@/lib/inventory-cache";

/** Filtros que usa el buscador principal; el resto de la URL se ignora (y no fragmenta la caché). */
export type FinderFilters = Pick<SearchFilters, "condicion" | "tipo" | "marca" | "modelo" | "combustible" | "transmision" | "car">;

export const FINDER_FEATURE_LIMIT = 12;

export type FinderFacets = {
  /** Vehículos que cumplen todos los filtros. */
  total: number;
  /** Vehículos por modelo de la marca con los demás filtros (sin `modelo`). */
  models: Record<string, number>;
  /** Características presentes en los resultados, de más a menos frecuente; las elegidas siempre van. */
  features: { slug: string; name: string; icon: string; n: number }[];
};

export function normalizeFinderFilters(f: SearchFilters): FinderFilters {
  return {
    condicion: f.condicion,
    tipo: f.tipo,
    marca: f.marca,
    modelo: f.marca ? f.modelo : undefined,
    combustible: f.combustible,
    transmision: f.transmision,
    // Orden estable: la misma selección en otro orden reutiliza la entrada de caché.
    car: f.car?.length ? [...new Set(f.car)].sort() : undefined,
  };
}

async function computeFacets(f: FinderFilters): Promise<FinderFacets> {
  const where = buildWhere(f);
  const selected = f.car ?? [];
  const [total, byFeature, byModel] = await Promise.all([
    db.vehicle.count({ where }),
    // "Si además elijo esta característica, ¿cuántos quedan?" = vehículos del resultado que la tienen.
    db.vehicleFeature.groupBy({
      by: ["featureId"],
      where: { vehicle: where },
      _count: { featureId: true },
      orderBy: { _count: { featureId: "desc" } },
      take: FINDER_FEATURE_LIMIT + selected.length,
    }),
    f.marca
      ? db.vehicle.groupBy({ by: ["modelId"], where: buildWhere({ ...f, modelo: undefined }), _count: true })
      : Promise.resolve([]),
  ]);

  const [features, models] = await Promise.all([
    db.feature.findMany({
      where: { OR: [{ id: { in: byFeature.map((g) => g.featureId) } }, { slug: { in: selected } }] },
      select: { id: true, slug: true, name: true, icon: true },
    }),
    byModel.length ? db.model.findMany({ where: { id: { in: byModel.map((g) => g.modelId) } }, select: { id: true, slug: true } }) : [],
  ]);

  const count = new Map(byFeature.map((g) => [g.featureId, g._count.featureId]));
  const ranked = features
    .map((x) => ({ slug: x.slug, name: x.name, icon: x.icon, n: count.get(x.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "es"));
  const picked = ranked.filter((x) => selected.includes(x.slug));
  const others = ranked.filter((x) => !selected.includes(x.slug) && x.n > 0).slice(0, Math.max(0, FINDER_FEATURE_LIMIT - picked.length));

  const slugById = new Map(models.map((m) => [m.id, m.slug]));
  return {
    total,
    models: Object.fromEntries(byModel.map((g) => [slugById.get(g.modelId)!, g._count])),
    features: [...picked, ...others].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "es")),
  };
}

/**
 * Facetas del buscador principal, cacheadas por combinación de filtros.
 * Se invalidan con la etiqueta del inventario y, como red de seguridad, cada INVENTORY_TTL_SECONDS.
 */
export const getFinderFacets = unstable_cache(computeFacets, ["finder-facets-v1"], {
  tags: [INVENTORY_TAG],
  revalidate: INVENTORY_TTL_SECONDS,
});
