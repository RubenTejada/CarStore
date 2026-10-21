import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import sharp from "sharp";
import type { z } from "zod";
import { CLAUDE_MODEL, createClaudeClient, isClaudeConfigured, refusalFallback, type ClaudeClient } from "@/lib/claude";
import { db } from "@/lib/db";
import { FetchError, safeFetch } from "@/lib/safe-fetch";
import { MAX_BYTES, saveImageBuffer } from "@/lib/upload";
import {
  InventoryExtraction,
  ListingExtraction,
  canonicalUrl,
  catalogPrompt,
  inventoryDigest,
  listingDigest,
  normalizeListing,
  pickLinks,
  type CatalogBrand,
  type CatalogFeature,
  type ImportedListing,
} from "@/lib/listing-parse";

/**
 * Importación de anuncios desde otros portales (SuperCarros, Corotos, la web de un dealer…).
 * Cada portal tiene su propio formato, así que se descarga la página y Claude la lee con salida
 * estructurada contra el catálogo del portal; aquí se validan los valores y se copian las fotos
 * a `uploads/`. Solo lee el HTML que entrega el servidor: las páginas que se arman por completo
 * con JavaScript en el navegador no traen los datos.
 */

const MAX_PAGE_BYTES = 6 * 1024 * 1024;
// Las miniaturas de los listados miden 117–188 px; algunos portales publican fotos originales de ~260 px.
const MIN_PHOTO_WIDTH = 240;

export class ImportError extends Error {}

let client: ClaudeClient | null = null;
function claude() {
  if (!isClaudeConfigured()) throw new ImportError("La importación no está configurada: falta la clave de Claude (ANTHROPIC_API_KEY o ANTHROPIC_FOUNDRY_API_KEY).");
  return (client ??= createClaudeClient());
}

const LISTING_PROMPT = `Arriba está la página de un anuncio de otro portal de vehículos de República Dominicana.
Extrae los datos del vehículo para publicarlo en nuestro portal:
- Usa solo lo que dice la página; si un dato no aparece, null. No inventes ni estimes.
- Marca y modelo: si están en el catálogo, escribe los nombres exactos del catálogo (p. ej. «CRV» → «CR-V»); si no, como los escribe el anuncio.
- Ignora los anuncios similares, recomendados o del resto del inventario que salgan en la página.
- Fotos: solo las del vehículo anunciado (no logos, banners ni miniaturas de otros anuncios).`;

const INVENTORY_PROMPT = `Arriba está una página de otro portal de vehículos con el inventario de un dealer o vendedor.
Indica qué enlaces abren el anuncio individual de cada vehículo de ESTE inventario (no filtros, marcas, categorías, anuncios patrocinados ni de otros vendedores) y cuál lleva a la página siguiente del mismo listado.`;

async function extract<T extends z.ZodType>(schema: T, system: string, document: string, prompt: string): Promise<z.infer<T>> {
  const msg = await claude().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16_000,
    ...refusalFallback(),
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    // El catálogo es igual en todas las llamadas de una importación: se cachea.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: [{ type: "document", source: { type: "text", media_type: "text/plain", data: document } }, { type: "text", text: prompt }] }],
  });
  if (msg.stop_reason === "refusal") throw new ImportError("No se pudo leer la página.");
  if (!msg.parsed_output) throw new ImportError("No se pudieron extraer los datos de la página.");
  return msg.parsed_output;
}

async function fetchPage(url: string) {
  const doc = await safeFetch(url, { maxBytes: MAX_PAGE_BYTES, accept: "text/html,application/xhtml+xml" }).catch((e) => {
    throw new ImportError(e instanceof FetchError ? e.message : "No se pudo abrir el enlace.");
  });
  if (!/html|xml/i.test(doc.contentType) && !/^\s*</.test(doc.body.subarray(0, 200).toString())) throw new ImportError("El enlace no es una página web.");
  return { url: doc.url, html: doc.body.toString("utf8") };
}

/** Catálogo (marcas, modelos y versiones) y características para leer anuncios. */
export async function loadImportCatalog() {
  const [brands, features] = await Promise.all([
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, models: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, bodyType: true, trims: { select: { id: true, name: true, slug: true } } } } },
    }),
    db.feature.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  return { brands, features, system: catalogPrompt(brands, features) };
}
export type ImportCatalog = { brands: CatalogBrand[]; features: CatalogFeature[]; system: string };

/** Descarga y lee el anuncio de `url`. Las fotos quedan como URLs del otro portal (ver `importPhotos`). */
export async function readListing(url: string, catalog: ImportCatalog): Promise<ImportedListing> {
  const page = await fetchPage(url);
  const { text, images } = listingDigest(page.html, page.url);
  const x = await extract(ListingExtraction, catalog.system, text, LISTING_PROMPT);
  if (!x.isVehicleListing) throw new ImportError("La página no parece el anuncio de un vehículo.");
  return normalizeListing(x, { sourceUrl: canonicalUrl(page.html, page.url), images, brands: catalog.brands, features: catalog.features });
}

/** Copia las fotos a `uploads/` (WebP), en orden; descarta las que fallan o son miniaturas. */
export async function importPhotos(urls: string[]) {
  const saved: (string | null)[] = new Array(urls.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      try {
        const { body } = await safeFetch(urls[i], { maxBytes: MAX_BYTES, timeoutMs: 30_000, accept: "image/avif,image/webp,image/jpeg,image/png,*/*" });
        const meta = await sharp(body).metadata();
        if ((meta.autoOrient?.width ?? meta.width ?? 0) < MIN_PHOTO_WIDTH) continue;
        saved[i] = await saveImageBuffer(body, "vehicle");
      } catch {
        // Una foto que no se puede descargar o no es imagen se omite; el resto del anuncio sigue.
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const photos = saved.filter((u): u is string => !!u);
  return { photos, failed: urls.length - photos.length };
}

/**
 * Recorre el inventario desde `url` (siguiendo «página siguiente») y devuelve los enlaces de los
 * anuncios, hasta `maxListings`. `onPage` se llama tras cada página (para marcar el avance).
 */
export async function discoverInventory(url: string, catalog: ImportCatalog, { maxPages = 15, maxListings = 200, onPage = async (): Promise<unknown> => undefined } = {}) {
  const listings = new Set<string>();
  const visited = new Set<string>();
  let current: string | null = url;
  while (current && visited.size < maxPages && listings.size < maxListings) {
    visited.add(current);
    const page = await fetchPage(current);
    visited.add(page.url);
    const { text, links } = inventoryDigest(page.html, page.url);
    const x = await extract(InventoryExtraction, catalog.system, text, INVENTORY_PROMPT);
    if (!x.isInventoryPage && visited.size <= 2) throw new ImportError("La página no parece un listado de vehículos.");
    const picked = pickLinks(x, links);
    const before = listings.size;
    for (const l of picked.listings) if (listings.size < maxListings) listings.add(l);
    // Una página sin anuncios nuevos significa que el listado terminó (o que la paginación da vueltas).
    if (listings.size === before) break;
    await onPage();
    current = picked.nextPage && !visited.has(picked.nextPage) ? picked.nextPage : null;
  }
  if (!listings.size) throw new ImportError("No se encontraron anuncios de vehículos en la página.");
  return [...listings];
}
