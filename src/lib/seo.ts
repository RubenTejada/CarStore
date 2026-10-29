import type { Metadata } from "next";
import { parseSearchParams, toQueryString, type RawSearchParams } from "@/lib/search-params";

export const SITE_NAME = "TuCarroOnline";
export const SITE_TITLE = "TuCarroOnline — Vehículos nuevos y usados en República Dominicana";
export const SITE_DESCRIPTION = "Compra y vende carros, jeepetas y camionetas nuevos y usados en República Dominicana. Compara precios, fotos y características de dealers y vendedores particulares.";
export const NO_INDEX = { index: false, follow: true } as const;

/** Un solo origen para enlaces canónicos, fotos y sitemaps, independiente del host de la petición. */
export function siteUrl(path = "/") {
  const base = new URL(process.env.SITE_URL || "https://tucarroonline.com");
  if (!/^https?:$/.test(base.protocol)) throw new Error("SITE_URL debe ser una URL http(s).");
  return new URL(path, base.origin).href;
}

export function pageMetadata({ path, title, description, images = [] }: {
  path: string;
  title: string;
  description: string;
  images?: string[];
}): Metadata {
  const url = siteUrl(path);
  const photos = images.map((image) => ({ url: siteUrl(image), alt: title }));
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "es_DO", siteName: SITE_NAME, url, title, description, images: photos },
    twitter: { card: photos.length ? "summary_large_image" : "summary", title, description, images: photos },
  };
}

/** Categorías y paginación indexables; búsquedas libres y combinaciones de facetas quedan fuera del índice. */
export function browseMetadata(path: string, raw: RawSearchParams, title: string, description: string): Metadata {
  const filters = parseSearchParams(raw);
  const indexable = new Set(["tipo", "marca", "modelo", "condicion", "provincia", "pagina"]);
  const index = Object.keys(filters).every((key) => indexable.has(key));
  const query = toQueryString({ ...filters, vista: undefined, orden: undefined, moneda: undefined, pagina: filters.pagina === 1 ? undefined : filters.pagina });
  return {
    ...pageMetadata({ path: path + query, title: filters.pagina && filters.pagina > 1 ? `${title} — Página ${filters.pagina}` : title, description }),
    robots: index ? { index: true, follow: true } : NO_INDEX,
  };
}

/** Evita que el contenido de un vendedor pueda cerrar la etiqueta script de JSON-LD. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
