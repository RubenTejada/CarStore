import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { BodyType } from "@/generated/prisma/enums";
import { buildOrderBy, buildWhere, type SearchFilters } from "@/lib/search-params";
import { sweepExpiredSubscriptions } from "@/lib/listing-rules";
import { getUsdRate } from "@/lib/exchange-rate";
import { priceHistogram, yearHistogram } from "@/lib/histogram";

export const PAGE_SIZE = 18;

/** Datos mínimos para tarjetas y marcadores de mapa. */
export const vehicleCardSelect = {
  id: true,
  year: true,
  trim: true,
  condition: true,
  price: true,
  currency: true,
  mileageKm: true,
  transmission: true,
  fuel: true,
  bodyType: true,
  province: true,
  lat: true,
  lng: true,
  featuredUntil: true,
  model: { select: { name: true, slug: true, brand: { select: { name: true, slug: true } } } },
  dealer: { select: { name: true, slug: true, logoUrl: true, verified: true } },
  photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.VehicleSelect;

export type VehicleCard = Prisma.VehicleGetPayload<{ select: typeof vehicleCardSelect }>;

export async function searchVehicles(filters: SearchFilters) {
  // `getUsdRate` programa el refresco diario de la tasa, que recalcula `priceDop` sin hacer esperar.
  await Promise.all([sweepExpiredSubscriptions(), getUsdRate()]);
  const where = buildWhere(filters);
  const page = filters.pagina ?? 1;
  const [items, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      select: vehicleCardSelect,
      orderBy: buildOrderBy(filters.orden),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.vehicle.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Marcadores para el mapa (todos los resultados, hasta un límite). */
export async function searchMapPoints(filters: SearchFilters, limit = 600) {
  await getUsdRate();
  return db.vehicle.findMany({
    where: buildWhere(filters),
    select: vehicleCardSelect,
    orderBy: buildOrderBy(filters.orden),
    take: limit,
  });
}

/**
 * Conteos por tipo de carrocería, por marca y (con un modelo elegido) por versión,
 * más los histogramas de precio y año, respetando los demás filtros.
 */
export async function getFacets(filters: SearchFilters) {
  const [byType, byModel, byTrim, byPrice, byYear] = await Promise.all([
    db.vehicle.groupBy({ by: ["bodyType"], where: buildWhere(filters, "tipo"), _count: true }),
    db.vehicle.groupBy({ by: ["modelId"], where: buildWhere(filters, "marca"), _count: true }),
    filters.marca && filters.modelo
      ? db.vehicle.groupBy({ by: ["trimId"], where: { AND: [buildWhere(filters, "version"), { trimId: { not: null } }] }, _count: true })
      : [],
    db.vehicle.groupBy({ by: ["priceDop"], where: buildWhere(filters, "precio"), _count: true }),
    db.vehicle.groupBy({ by: ["year"], where: buildWhere(filters, "anio"), _count: true }),
  ]);
  const models = await db.model.findMany({
    where: { id: { in: byModel.map((m) => m.modelId) } },
    select: { id: true, brand: { select: { slug: true } } },
  });
  const brandOf = new Map(models.map((m) => [m.id, m.brand.slug]));
  const brands: Record<string, number> = {};
  for (const m of byModel) {
    const b = brandOf.get(m.modelId);
    if (b) brands[b] = (brands[b] ?? 0) + m._count;
  }
  const types = Object.fromEntries(byType.map((t) => [t.bodyType, t._count])) as Partial<
    Record<BodyType, number>
  >;
  const trims = Object.fromEntries(byTrim.map((t) => [t.trimId!, t._count]));
  const prices = priceHistogram(byPrice.map((p) => ({ value: p.priceDop, count: p._count })));
  const years = yearHistogram(byYear.map((y) => ({ value: y.year, count: y._count })));
  return { types, brands, trims, prices, years };
}

export async function getFeaturedVehicles(limit = 8) {
  return db.vehicle.findMany({
    where: { status: "ACTIVE", featuredUntil: { gt: new Date() } },
    select: vehicleCardSelect,
    orderBy: { featuredUntil: "desc" },
    take: limit,
  });
}
