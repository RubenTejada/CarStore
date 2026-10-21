"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountScope } from "@/lib/listing-rules";
import { getUsdRate } from "@/lib/exchange-rate";
import { getVehicleFormData } from "@/lib/vehicle-form-data";
import { PROVINCES } from "@/lib/provinces";
import { ImportError, importPhotos, loadImportCatalog, readListing } from "@/lib/listing-import";
import { STALE_MS, runImportJob } from "@/lib/inventory-import";
import { FetchError, parsePublicUrl } from "@/lib/safe-fetch";
import { isClaudeConfigured } from "@/lib/claude";
import type { VehicleFormValues } from "@/components/forms/vehicle-form";
import type { FormState } from "./auth";

const importSchema = z.object({
  url: z.string().trim().min(1, "Pega el enlace del anuncio.").max(2000),
  owner: z.literal("on", { error: "Confirma que el anuncio es tuyo o de tu dealer." }),
});

const NOT_CONFIGURED = "La importación desde otros portales no está disponible en este momento.";

function publicUrl(raw: string) {
  try {
    return { url: parsePublicUrl(raw).href };
  } catch (e) {
    return { error: e instanceof FetchError ? e.message : "El enlace no es válido." };
  }
}

export type ImportListingState = { error?: string; values?: VehicleFormValues; notes?: string[]; title?: string; at?: number } | undefined;

/**
 * Lee el anuncio de otro portal y devuelve los valores del formulario de vehículo ya llenos
 * (con las fotos copiadas a `uploads/`). No guarda nada: el vendedor revisa y publica.
 */
export async function importListing(_: ImportListingState, form: FormData): Promise<ImportListingState> {
  const user = await requireUser("DEALER", "SELLER");
  if (!isClaudeConfigured()) return { error: NOT_CONFIGURED };
  const parsed = importSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const checked = publicUrl(parsed.data.url);
  if (checked.error) return { error: checked.error };

  try {
    const listing = await readListing(checked.url!, await loadImportCatalog());
    const existing = await db.vehicle.findFirst({ where: { ...accountScope(user), sourceUrl: { in: [checked.url!, listing.sourceUrl] } }, select: { id: true } });
    if (existing) return { error: "Ya importaste este anuncio. Búscalo en «Mis vehículos»." };

    const [{ defaults }, { photos, failed }] = await Promise.all([getVehicleFormData(user), importPhotos(listing.photoUrls)]);
    const notes: string[] = [];
    if (!listing.modelId) notes.push(`«${listing.modelLabel}» no está en nuestro catálogo: elige la marca y el modelo más parecidos.`);
    if (!listing.price) notes.push("No encontramos el precio: escríbelo.");
    if (!listing.year) notes.push("No encontramos el año: selecciónalo.");
    if (!photos.length) notes.push("No se pudieron copiar las fotos: súbelas.");
    else if (failed) notes.push(`Se copiaron ${photos.length} fotos; ${failed} no se pudieron descargar.`);

    // El dealer muestra sus vehículos en su local; el particular, en la provincia del anuncio.
    const province = !user.dealerId && listing.province ? PROVINCES.find((p) => p.name === listing.province) : undefined;
    const values: VehicleFormValues = {
      ...defaults,
      brandId: listing.brandId ?? "",
      modelId: listing.modelId ?? "",
      bodyType: listing.bodyType,
      year: listing.year ?? defaults.year,
      trimId: listing.trimId ?? "",
      trim: listing.trim ?? "",
      condition: listing.condition,
      price: listing.price ?? "",
      currency: listing.currency,
      mileageKm: listing.mileageKm,
      transmission: listing.transmission,
      fuel: listing.fuel,
      drivetrain: listing.drivetrain,
      engine: listing.engine ?? "",
      extColor: listing.extColor ?? "",
      intColor: listing.intColor ?? "",
      doors: listing.doors ?? defaults.doors,
      seats: listing.seats ?? defaults.seats,
      description: listing.description ?? "",
      ...(province && { province: province.name, lat: province.lat, lng: province.lng }),
      photos,
      features: listing.features,
      sourceUrl: listing.sourceUrl,
    };
    return { values, notes, title: listing.title, at: Date.now() };
  } catch (e) {
    if (!(e instanceof ImportError)) console.error("Importación de anuncio", checked.url, e);
    return { error: e instanceof ImportError ? e.message : "No se pudo importar el anuncio. Intenta de nuevo." };
  }
}

/** Inicia la importación del inventario del dealer desde su página en otro portal. */
export async function startInventoryImport(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER");
  if (!user.dealerId) return { error: "Solo los dealers pueden importar un inventario." };
  if (!isClaudeConfigured()) return { error: NOT_CONFIGURED };
  const parsed = importSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const checked = publicUrl(parsed.data.url);
  if (checked.error) return { error: checked.error };

  const active = await db.importJob.findFirst({
    where: { dealerId: user.dealerId, status: { in: ["DISCOVERING", "RUNNING"] }, updatedAt: { gt: new Date(Date.now() - STALE_MS) } },
    select: { id: true },
  });
  if (active) return { error: "Ya hay una importación en curso. Espera a que termine." };

  const job = await db.importJob.create({ data: { dealerId: user.dealerId, userId: user.id, url: checked.url! }, select: { id: true } });
  const { rate } = await getUsdRate();
  after(() => runImportJob(job.id, rate).catch((e) => console.error("Importación de inventario", job.id, e)));
  revalidatePath("/panel/vehiculos/importar");
  return { ok: "Importación iniciada. Los vehículos aparecerán como borradores." };
}

/** Reanuda una importación interrumpida (p. ej. por un reinicio del servidor). */
export async function resumeImportJob(id: string): Promise<FormState> {
  const user = await requireUser("DEALER");
  const job = await db.importJob.findFirst({ where: { id, dealerId: user.dealerId ?? "" }, select: { id: true, status: true, updatedAt: true } });
  if (!job || (job.status !== "DISCOVERING" && job.status !== "RUNNING")) return { error: "Esta importación no se puede reanudar." };
  if (job.updatedAt > new Date(Date.now() - STALE_MS)) return { error: "La importación sigue en curso." };
  await db.importJob.update({ where: { id }, data: { updatedAt: new Date() } });
  const { rate } = await getUsdRate();
  after(() => runImportJob(id, rate).catch((e) => console.error("Importación de inventario", id, e)));
  revalidatePath("/panel/vehiculos/importar");
  return { ok: "Importación reanudada." };
}
