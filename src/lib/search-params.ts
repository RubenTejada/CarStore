import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { BodyType, Condition, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";

/**
 * Filtros de búsqueda: toda la búsqueda vive en la URL (compartible).
 * Parámetros en español, valores de enums en minúscula: ?tipo=jeepeta&marca=toyota
 */
const lowerEnum = <T extends Record<string, string>>(e: T) =>
  z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(e))
    .optional()
    .catch(undefined);

const int = z.coerce.number().int().nonnegative().optional().catch(undefined);
const slug = z
  .string()
  .regex(/^[a-z0-9-]{1,80}$/)
  .optional()
  .catch(undefined);
const text = z.string().trim().max(80).optional().catch(undefined);

export const SORTS = {
  recientes: "Más recientes",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  "anio-desc": "Año: más nuevo",
  "km-asc": "Menor kilometraje",
} as const;
export type Sort = keyof typeof SORTS;

const schema = z.object({
  condicion: z
    .enum(["nuevo", "usado"])
    .transform((v) => (v === "nuevo" ? Condition.NEW : Condition.USED))
    .optional()
    .catch(undefined),
  tipo: lowerEnum(BodyType),
  marca: slug,
  modelo: slug,
  version: slug,
  anioMin: int,
  anioMax: int,
  precioMin: int,
  precioMax: int,
  kmMax: int,
  transmision: lowerEnum(Transmission),
  combustible: lowerEnum(Fuel),
  traccion: lowerEnum(Drivetrain),
  color: text,
  provincia: text,
  dealer: slug,
  car: z
    .string()
    .transform((v) => v.split(",").filter((s) => /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 20))
    .optional()
    .catch(undefined),
  q: text,
  orden: z
    .enum(Object.keys(SORTS) as [Sort, ...Sort[]])
    .optional()
    .catch(undefined),
  pagina: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  vista: z.enum(["mapa"]).optional().catch(undefined),
});

export type SearchFilters = z.infer<typeof schema>;
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(raw: RawSearchParams): SearchFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    // Checkboxes repetidos (?car=a&car=b) se unen como "a,b".
    const value = Array.isArray(v) ? (k === "car" ? v.join(",") : v[0]) : v;
    if (value !== undefined && value !== "") flat[k] = value;
  }
  return schema.parse(flat);
}

/** Serializa filtros de vuelta a query string; `overrides` con `undefined` elimina el parámetro. */
export function toQueryString(filters: SearchFilters, overrides: Partial<Record<keyof SearchFilters, unknown>> = {}) {
  const merged: Record<string, unknown> = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "condicion") params.set(key, value === Condition.NEW ? "nuevo" : "usado");
    else if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (["tipo", "transmision", "combustible", "traccion"].includes(key))
      params.set(key, String(value).toLowerCase());
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

type Dimension = "tipo" | "marca" | "version";

/** Construye el `where` de Prisma. `omit` excluye una dimensión (para conteos por faceta). */
export function buildWhere(f: SearchFilters, omit?: Dimension): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [{ status: "ACTIVE" }];

  if (f.condicion) and.push({ condition: f.condicion });
  if (f.tipo && omit !== "tipo") and.push({ bodyType: f.tipo });
  if (f.marca && omit !== "marca") {
    and.push({ model: { brand: { slug: f.marca } } });
    if (f.modelo) {
      and.push({ model: { slug: f.modelo } });
      // La versión solo tiene sentido dentro de un modelo (los slugs se repiten entre modelos).
      if (f.version && omit !== "version") and.push({ catalogTrim: { slug: f.version } });
    }
  }
  if (f.anioMin) and.push({ year: { gte: f.anioMin } });
  if (f.anioMax) and.push({ year: { lte: f.anioMax } });
  if (f.precioMin) and.push({ priceDop: { gte: f.precioMin } });
  if (f.precioMax) and.push({ priceDop: { lte: f.precioMax } });
  if (f.kmMax !== undefined) and.push({ mileageKm: { lte: f.kmMax } });
  if (f.transmision) and.push({ transmission: f.transmision });
  if (f.combustible) and.push({ fuel: f.combustible });
  if (f.traccion) and.push({ drivetrain: f.traccion });
  if (f.color) and.push({ extColor: { equals: f.color, mode: "insensitive" } });
  if (f.provincia) and.push({ province: f.provincia });
  if (f.dealer) and.push({ dealer: { slug: f.dealer } });
  for (const feature of f.car ?? []) and.push({ features: { some: { feature: { slug: feature } } } });
  if (f.q) {
    const words = f.q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      const or: Prisma.VehicleWhereInput[] = [
        { model: { name: { contains: w, mode: "insensitive" } } },
        { model: { brand: { name: { contains: w, mode: "insensitive" } } } },
        { trim: { contains: w, mode: "insensitive" } },
      ];
      if (/^\d{4}$/.test(w)) or.push({ year: Number(w) });
      and.push({ OR: or });
    }
  }
  return { AND: and };
}

export function buildOrderBy(sort: Sort | undefined): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "precio-asc":
      return [{ priceDop: "asc" }];
    case "precio-desc":
      return [{ priceDop: "desc" }];
    case "anio-desc":
      return [{ year: "desc" }, { createdAt: "desc" }];
    case "km-asc":
      return [{ mileageKm: "asc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}
