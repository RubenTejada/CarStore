import { z } from "zod";
import { BodyType, Condition, Currency, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";
import { htmlToText, jsonLdBlocks, metaTags, pageImages, pageLinks } from "@/lib/html";
import { slugify } from "@/lib/labels";
import { PROVINCE_NAMES } from "@/lib/provinces";

/**
 * Parte pura de la importación de anuncios de otros portales (sin red ni base de datos):
 * qué se le da a Claude de la página, qué devuelve y cómo se lleva al formato del portal.
 * La descarga y las llamadas están en `listing-import.ts`.
 */

const MAX_TEXT_CHARS = 60_000;
const MAX_IMAGES = 150;
const MAX_LINKS = 400;
export const MAX_PHOTOS = 30;

/** Respuesta de Claude para la página de un anuncio. */
export const ListingExtraction = z.object({
  isVehicleListing: z.boolean().describe("true si la página es el anuncio de UN vehículo en venta (carro, jeepeta, camioneta…)."),
  title: z.string().describe("Título del anuncio tal como aparece."),
  brand: z.string().nullable().describe("Marca. Si está en el catálogo, el nombre exacto del catálogo."),
  model: z.string().nullable().describe("Modelo. Si está en el catálogo, el nombre exacto del catálogo para esa marca."),
  trim: z.string().nullable().describe("Versión o edición (LX, Limited, Sport…), sin repetir marca ni modelo; null si no se indica."),
  year: z.number().int().nullable(),
  condition: z.enum(Condition).nullable().describe("NEW si es nuevo / 0 km; USED si es usado."),
  price: z.number().nullable().describe("Precio de venta (no la inicial ni la cuota mensual), sin separadores."),
  currency: z.enum(Currency).nullable().describe("USD para US$, USD o dólares; DOP para RD$ o pesos."),
  mileage: z.number().nullable().describe("Kilometraje o millaje recorrido; null si no se indica o dice N/D."),
  mileageUnit: z.enum(["KM", "MI"]).nullable(),
  bodyType: z.enum(BodyType).nullable().describe("JEEPETA para SUV/jeepeta/crossover; PICKUP para camioneta de cama; VAN para guagua o van."),
  transmission: z.enum(Transmission).nullable(),
  fuel: z.enum(Fuel).nullable().describe("GLP si es a gas."),
  drivetrain: z.enum(Drivetrain).nullable().describe("FWD delantera, RWD trasera, AWD integral, FOUR_WD 4x4."),
  engine: z.string().nullable().describe("Motor, corto: «2.0L 4 cil. turbo»."),
  extColor: z.string().nullable().describe("Color exterior en español, con mayúscula inicial («Gris»)."),
  intColor: z.string().nullable().describe("Color interior en español, con mayúscula inicial."),
  doors: z.number().int().nullable(),
  seats: z.number().int().nullable().describe("Pasajeros."),
  description: z.string().nullable().describe("Descripción escrita por el vendedor, copiada tal cual (sin datos de contacto); null si no hay."),
  features: z.array(z.string()).describe("Claves de la lista de características que el anuncio menciona."),
  province: z.string().nullable().describe("Provincia de la lista donde está el vehículo; null si no se indica."),
  photos: z.array(z.number().int()).describe("Números de las imágenes candidatas que son fotos de ESTE vehículo, en el orden de la galería, cada foto una sola vez en su mayor tamaño."),
});
export type ListingExtraction = z.infer<typeof ListingExtraction>;

/** Respuesta de Claude para la página del inventario de un dealer. */
export const InventoryExtraction = z.object({
  isInventoryPage: z.boolean().describe("true si la página lista varios vehículos en venta (el inventario de un dealer o vendedor)."),
  listings: z.array(z.number().int()).describe("Números de los enlaces que llevan al anuncio individual de cada vehículo del listado, sin repetir."),
  nextPage: z.number().int().nullable().describe("Número del enlace a la página siguiente del mismo listado; null si es la última."),
});
export type InventoryExtraction = z.infer<typeof InventoryExtraction>;

export type CatalogBrand = { id: string; name: string; slug: string; models: { id: string; name: string; slug: string; bodyType: BodyType; trims: { id: string; name: string; slug: string }[] }[] };
export type CatalogFeature = { slug: string; name: string };

/** Catálogo y características para el prompt (estable entre llamadas: se puede cachear). */
export function catalogPrompt(brands: CatalogBrand[], features: CatalogFeature[]) {
  return [
    "Catálogo de marcas y modelos del portal (marca: modelos):",
    ...brands.map((b) => `${b.name}: ${b.models.map((m) => m.name).join(" | ")}`),
    "",
    "Características (clave: nombre):",
    ...features.map((f) => `${f.slug}: ${f.name}`),
    "",
    `Provincias: ${PROVINCE_NAMES.join(", ")}`,
  ].join("\n");
}

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** URL canónica del anuncio (para no importarlo dos veces): `<link rel=canonical>` u `og:url` del mismo sitio. */
export function canonicalUrl(html: string, fetchedUrl: string) {
  const fetched = new URL(fetchedUrl);
  const candidates = [
    /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1],
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i.exec(html)?.[1],
    metaTags(html)["og:url"],
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      const url = new URL(c, fetched);
      if ((url.protocol === "https:" || url.protocol === "http:") && sameSite(url.hostname, fetched.hostname)) {
        url.hash = "";
        return url.href;
      }
    } catch {}
  }
  fetched.hash = "";
  return fetched.href;
}

/** Lo que Claude lee del anuncio: metadatos, JSON-LD, el texto visible y la lista numerada de imágenes. */
export function listingDigest(html: string, url: string) {
  const images = pageImages(html, url).slice(0, MAX_IMAGES);
  const meta = metaTags(html);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const text = [
    `URL: ${url}`,
    title && `Título de la página: ${htmlToText(title)}`,
    ...Object.entries(meta).map(([k, v]) => `${k}: ${v}`),
    ...jsonLdBlocks(html).map((j) => `JSON-LD: ${j.slice(0, 8_000)}`),
    "",
    "Texto de la página:",
    htmlToText(html).slice(0, MAX_TEXT_CHARS),
    "",
    "Imágenes candidatas:",
    ...images.map((src, i) => `${i}: ${src}`),
  ]
    .filter((l) => l !== undefined)
    .join("\n");
  return { text, images };
}

/** Lo que Claude lee del inventario: el texto de la página y los enlaces numerados del mismo sitio. */
export function inventoryDigest(html: string, url: string) {
  const host = new URL(url).hostname;
  const links = pageLinks(html, url)
    .filter((l) => sameSite(new URL(l.url).hostname, host) && l.url !== url)
    .slice(0, MAX_LINKS);
  const text = [`URL: ${url}`, "", "Texto de la página:", htmlToText(html).slice(0, 20_000), "", "Enlaces:", ...links.map((l, i) => `${i}: ${l.url} ${l.text}`)].join("\n");
  return { text, links: links.map((l) => l.url) };
}

/** Elige los enlaces por número: solo los que estaban en la lista (Claude no inventa URLs). */
export function pickLinks(x: InventoryExtraction, links: string[]) {
  const at = (i: number | null) => (i !== null && Number.isInteger(i) && i >= 0 && i < links.length ? links[i] : null);
  return {
    listings: [...new Set(x.listings.map(at).filter((u): u is string => !!u))],
    nextPage: at(x.nextPage),
  };
}

const compact = (s: string) => slugify(s).replace(/-/g, "");

/** Marca y modelo del catálogo para los nombres extraídos (sin distinguir guiones, espacios ni acentos). */
export function matchModel(brands: CatalogBrand[], brandName: string | null, modelName: string | null) {
  if (!brandName) return null;
  const b = compact(brandName);
  const brand = brands.find((x) => compact(x.name) === b || x.slug.replace(/-/g, "") === b);
  if (!brand || !modelName) return brand ? { brand, model: null } : null;
  const m = compact(modelName);
  const model =
    brand.models.find((x) => compact(x.name) === m || x.slug.replace(/-/g, "") === m) ??
    // «Clase GLE 450» o «CR-V EX-L» escritos con la versión pegada al modelo.
    brand.models.filter((x) => m.startsWith(compact(x.name))).sort((x, y) => y.name.length - x.name.length)[0] ??
    null;
  return { brand, model };
}

export type ImportedListing = {
  sourceUrl: string;
  title: string;
  brandId: string | null;
  modelId: string | null;
  /** Marca y modelo tal como los nombra el anuncio (para avisar si no están en el catálogo). */
  modelLabel: string;
  bodyType: BodyType;
  year: number | null;
  trimId: string | null;
  trim: string | null;
  condition: Condition;
  price: number | null;
  currency: Currency;
  mileageKm: number;
  transmission: Transmission;
  fuel: Fuel;
  drivetrain: Drivetrain;
  engine: string | null;
  extColor: string | null;
  intColor: string | null;
  doors: number | null;
  seats: number | null;
  description: string | null;
  province: string | null;
  features: string[];
  photoUrls: string[];
};

const text = (v: string | null, max: number) => v?.trim().slice(0, max) || null;
const intIn = (v: number | null, min: number, max: number) => (v !== null && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null);

/** Lleva la extracción al formato del portal, con los rangos que valida `saveVehicle`. */
export function normalizeListing(
  x: ListingExtraction,
  { sourceUrl, images, brands, features }: { sourceUrl: string; images: string[]; brands: CatalogBrand[]; features: CatalogFeature[] },
  thisYear = new Date().getFullYear(),
): ImportedListing {
  const match = matchModel(brands, x.brand, x.model);
  const model = match?.model ?? null;
  const trimText = text(x.trim, 60);
  const catalogTrim = model && trimText ? (model.trims.find((t) => t.slug === slugify(trimText)) ?? null) : null;
  const km = x.mileage !== null && x.mileage >= 0 ? Math.round(x.mileageUnit === "MI" ? x.mileage * 1.609344 : x.mileage) : 0;
  const featureSlugs = new Set(features.map((f) => f.slug));
  return {
    sourceUrl,
    title: x.title.trim().slice(0, 160),
    brandId: match?.brand.id ?? null,
    modelId: model?.id ?? null,
    modelLabel: [x.brand, x.model].filter(Boolean).join(" ") || x.title,
    bodyType: model?.bodyType ?? x.bodyType ?? "SEDAN",
    year: intIn(x.year, 1950, thisYear + 1),
    trimId: catalogTrim?.id ?? null,
    trim: catalogTrim?.name ?? trimText,
    condition: x.condition ?? "USED",
    price: intIn(x.price, 1000, 500_000_000),
    currency: x.currency ?? "DOP",
    mileageKm: Math.min(km, 2_000_000),
    transmission: x.transmission ?? "AUTOMATIC",
    fuel: x.fuel ?? "GASOLINE",
    drivetrain: x.drivetrain ?? "FWD",
    engine: text(x.engine, 60),
    extColor: text(x.extColor, 30),
    intColor: text(x.intColor, 30),
    doors: intIn(x.doors, 1, 6),
    seats: intIn(x.seats, 1, 20),
    description: text(x.description, 4000),
    province: x.province && PROVINCE_NAMES.includes(x.province) ? x.province : null,
    features: [...new Set(x.features.filter((f) => featureSlugs.has(f)))],
    photoUrls: [...new Set(x.photos.filter((i) => Number.isInteger(i) && i >= 0 && i < images.length).map((i) => images[i]))].slice(0, MAX_PHOTOS),
  };
}
