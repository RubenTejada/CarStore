// Búsqueda en lenguaje natural: el texto que el buscador local no entiende lo traduce Claude a filtros
// de /vehiculos (ver search-ai.ts). Aquí, sin dependencias de servidor, el esquema de la respuesta,
// el catálogo para el prompt y la validación de lo que devuelve.
import { z } from "zod";
import { BodyType, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";
import { BODY_TYPE_LABEL, COLORS, DRIVETRAIN_LABEL, FUEL_LABEL, TRANSMISSION_LABEL } from "@/lib/labels";
import { SORTS, type Sort } from "@/lib/search-params";
import type { SearchIndex } from "@/lib/search-suggest";

const lower = <T extends Record<string, string>>(e: T) => Object.values(e).map((v) => v.toLowerCase());
const none = (...values: string[]) => z.enum(["", ...values] as [string, ...string[]]);

/** Respuesta de Claude. Sin campos `nullable` (la API limita las uniones): vacío o 0 = sin filtro. */
export const AiSearch = z.object({
  understood: z.boolean().describe("false si el texto no expresa ningún criterio para buscar un vehículo."),
  condicion: none("nuevo", "usado"),
  tipo: none(...lower(BodyType)),
  marca: z.string().describe("Clave de la marca del catálogo; vacío si no se menciona."),
  modelo: z.string().describe("Clave del modelo dentro de esa marca; vacío si no se menciona."),
  precioMin: z.number().int().describe("Precio mínimo en RD$; 0 si no hay."),
  precioMax: z.number().int().describe("Precio máximo en RD$; 0 si no hay."),
  anioMin: z.number().int().describe("0 si no hay."),
  anioMax: z.number().int().describe("0 si no hay."),
  kmMax: z.number().int().describe("Kilometraje máximo; 0 si no hay."),
  transmision: none(...lower(Transmission)),
  combustible: none(...lower(Fuel)),
  traccion: none(...lower(Drivetrain)),
  provincia: z.string().describe("Nombre exacto de la lista de provincias; vacío si no hay."),
  color: z.string().describe("Color exterior de la lista; vacío si no hay."),
  car: z.array(z.string()).describe("Claves de características pedidas."),
  orden: none(...(Object.keys(SORTS) as Sort[])),
});
export type AiSearch = z.infer<typeof AiSearch>;

export type AiCatalog = { brands: { slug: string; name: string; models: { slug: string; name: string }[] }[]; features: { slug: string; name: string }[]; provinces: string[] };

/** Marcas y modelos con vehículos publicados (del índice del autocompletado). */
export function aiCatalog(index: SearchIndex, features: AiCatalog["features"], provinces: string[]): AiCatalog {
  const brands = index.brands.map((b, i) => ({ slug: b.slug, name: b.name, models: index.models.filter((m) => m.brand === i).map((m) => ({ slug: m.slug, name: m.name })) }));
  return { brands, features, provinces };
}

/** Instrucciones y catálogo: iguales entre búsquedas mientras no cambie el inventario, así que se cachean. */
export function aiSystemPrompt(c: AiCatalog) {
  const labels = (rec: Record<string, string>) => Object.entries(rec).map(([k, v]) => `${k.toLowerCase()}=${v}`).join(", ");
  return [
    "Traduces lo que un visitante escribe en el buscador de un portal de vehículos de República Dominicana a filtros de búsqueda.",
    "- Usa solo criterios que el texto expresa; lo demás va vacío o 0. No inventes marcas, modelos ni rangos.",
    "- Habla dominicano: «jeepeta» es SUV, «guagua» es van, «camioneta» es pickup, «carro» es cualquier vehículo, «yipeta» = jeepeta.",
    "- Montos: «1.5 millones» = 1500000, «800 mil» = 800000. «Menos de X» es precioMax, «desde X» o «más de X» es precioMin. Si el monto es en dólares, conviértelo a RD$ con la tasa del mensaje.",
    "- «Barato» o «económico» sin monto: orden precio-asc. «Poco millaje»: orden km-asc. «Del año» o «0 km»: condicion nuevo.",
    "- Si piden algo que no está en el catálogo (otra marca o modelo), deja marca y modelo vacíos.",
    "",
    `Tipos: ${labels(BODY_TYPE_LABEL)}`,
    `Transmisión: ${labels(TRANSMISSION_LABEL)}`,
    `Combustible: ${labels(FUEL_LABEL)}`,
    `Tracción: ${labels(DRIVETRAIN_LABEL)}`,
    `Orden: ${Object.entries(SORTS).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    `Colores: ${COLORS.join(", ")}`,
    `Provincias: ${c.provinces.join(", ")}`,
    "",
    "Catálogo (clave marca: clave modelo=Nombre):",
    ...c.brands.map((b) => `${b.slug} (${b.name}): ${b.models.map((m) => `${m.slug}=${m.name}`).join(", ")}`),
    "",
    "Características (clave: nombre):",
    ...c.features.map((f) => `${f.slug}: ${f.name}`),
  ].join("\n");
}

const DEPENDENT: Record<string, string[]> = { marca: ["modelo", "version"], modelo: ["version"] };

/**
 * Parámetros de /vehiculos tras aplicar la respuesta sobre los filtros vigentes (sin `q`), o `null`
 * si no entendió nada o no añade ningún filtro válido. `ia` guarda el texto para mostrarlo.
 */
export function applyAiSearch(current: Record<string, string>, ai: AiSearch, catalog: AiCatalog, text: string): Record<string, string> | null {
  if (!ai.understood) return null;
  const out: Record<string, string> = { ...current };
  delete out.q;
  delete out.pagina;
  delete out.ia;
  let changed = false;
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === 0 || out[key] === String(value)) return;
    for (const dep of DEPENDENT[key] ?? []) delete out[dep];
    out[key] = String(value);
    changed = true;
  };

  const brand = catalog.brands.find((b) => b.slug === ai.marca);
  set("marca", brand?.slug);
  const models = catalog.brands.find((b) => b.slug === out.marca)?.models ?? [];
  set("modelo", models.find((m) => m.slug === ai.modelo)?.slug);
  set("condicion", ai.condicion);
  set("tipo", ai.tipo);
  for (const key of ["precioMin", "precioMax", "kmMax"] as const) set(key, ai[key] > 0 ? ai[key] : undefined);
  const year = new Date().getFullYear() + 1;
  for (const key of ["anioMin", "anioMax"] as const) set(key, ai[key] >= 1950 && ai[key] <= year ? ai[key] : undefined);
  set("transmision", ai.transmision);
  set("combustible", ai.combustible);
  set("traccion", ai.traccion);
  set("provincia", catalog.provinces.find((p) => p.toLowerCase() === ai.provincia.toLowerCase()));
  set("color", COLORS.find((c) => c.toLowerCase() === ai.color.toLowerCase()));
  set("orden", ai.orden === "recientes" ? undefined : ai.orden);
  const known = new Set(catalog.features.map((f) => f.slug));
  const car = [...new Set([...(out.car ? out.car.split(",") : []), ...ai.car.filter((s) => known.has(s))])];
  set("car", car.join(","));

  if (!changed) return null;
  out.ia = text.slice(0, 80);
  return out;
}
