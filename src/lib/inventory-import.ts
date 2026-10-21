import "server-only";
import { db } from "@/lib/db";
import { toDop } from "@/lib/labels";
import { ImportError, discoverInventory, importPhotos, loadImportCatalog, readListing, type ImportCatalog } from "@/lib/listing-import";

/**
 * Trabajo de importación del inventario de un dealer (modelo `ImportJob`). Corre después de
 * responder (`after`) en el mismo proceso: recorre el listado, y cada anuncio se importa como
 * borrador del dealer, con sus fotos. Los anuncios ya importados (misma `sourceUrl`) se omiten,
 * así reimportar el mismo listado solo agrega los vehículos nuevos.
 */

const CONCURRENCY = 3;
/** Sin avances en este tiempo, un trabajo en curso se considera interrumpido y se puede reanudar. */
export const STALE_MS = 3 * 60_000;

const message = (e: unknown) => (e instanceof ImportError ? e.message : "Error inesperado al importar.");

export async function runImportJob(jobId: string, usdRate: number) {
  const job = await db.importJob.findUnique({ where: { id: jobId }, include: { dealer: { select: { province: true, lat: true, lng: true } } } });
  if (!job || job.status === "DONE" || job.status === "FAILED") return;
  const catalog = await loadImportCatalog();

  if (job.status === "DISCOVERING") {
    try {
      const urls = await discoverInventory(job.url, catalog, { onPage: () => db.importJob.update({ where: { id: jobId }, data: { updatedAt: new Date() } }) });
      await db.importJobItem.createMany({ data: urls.map((url) => ({ jobId, url })), skipDuplicates: true });
      await db.importJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });
    } catch (e) {
      console.error("Importación de inventario", jobId, e);
      await db.importJob.update({ where: { id: jobId }, data: { status: "FAILED", error: message(e) } });
      return;
    }
  }

  // Los items en curso de una ejecución interrumpida vuelven a la cola.
  await db.importJobItem.updateMany({ where: { jobId, status: "RUNNING", updatedAt: { lt: new Date(Date.now() - STALE_MS) } }, data: { status: "PENDING" } });
  const ctx = { job, catalog, usdRate };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(ctx)));
  if (!(await db.importJobItem.count({ where: { jobId, status: { in: ["PENDING", "RUNNING"] } } })))
    await db.importJob.update({ where: { id: jobId }, data: { status: "DONE" } });
}

type Ctx = {
  job: { id: string; dealerId: string; userId: string; dealer: { province: string; lat: number; lng: number } };
  catalog: ImportCatalog;
  usdRate: number;
};

async function worker(ctx: Ctx) {
  for (;;) {
    const next = await db.importJobItem.findFirst({ where: { jobId: ctx.job.id, status: "PENDING" }, select: { id: true, url: true } });
    if (!next) return;
    // Reclama el item; si otra ejecución lo tomó primero, sigue con el siguiente.
    const { count } = await db.importJobItem.updateMany({ where: { id: next.id, status: "PENDING" }, data: { status: "RUNNING" } });
    if (!count) continue;
    const result = await importItem(ctx, next.url).catch((e) => {
      if (!(e instanceof ImportError)) console.error("Importación de anuncio", next.url, e);
      return { status: "FAILED" as const, error: message(e), title: null, vehicleId: null };
    });
    await db.importJobItem.update({ where: { id: next.id }, data: result });
    await db.importJob.update({ where: { id: ctx.job.id }, data: { updatedAt: new Date() } });
  }
}

async function importItem({ job, catalog, usdRate }: Ctx, url: string) {
  const already = (sourceUrl: string) => db.vehicle.findFirst({ where: { dealerId: job.dealerId, sourceUrl }, select: { id: true } });
  const before = await already(url);
  if (before) return { status: "SKIPPED" as const, error: "Ya estaba importado.", title: null, vehicleId: before.id };

  const l = await readListing(url, catalog);
  const dup = l.sourceUrl !== url && (await already(l.sourceUrl));
  if (dup) return { status: "SKIPPED" as const, error: "Ya estaba importado.", title: l.title, vehicleId: dup.id };
  if (!l.modelId) throw new ImportError(`«${l.modelLabel}» no está en el catálogo. Impórtalo desde «Publicar vehículo» eligiendo el modelo.`);
  if (!l.year) throw new ImportError("El anuncio no indica el año.");
  if (!l.price) throw new ImportError("El anuncio no indica el precio.");

  const { photos } = await importPhotos(l.photoUrls);
  const features = await db.feature.findMany({ where: { slug: { in: l.features } }, select: { id: true } });
  const vehicle = await db.vehicle.create({
    data: {
      ownerId: job.userId,
      dealerId: job.dealerId,
      modelId: l.modelId,
      bodyType: l.bodyType,
      year: l.year,
      trim: l.trim,
      trimId: l.trimId,
      condition: l.condition,
      price: l.price,
      currency: l.currency,
      priceDop: toDop(l.price, l.currency, usdRate),
      mileageKm: l.condition === "NEW" ? Math.min(l.mileageKm, 500) : l.mileageKm,
      transmission: l.transmission,
      fuel: l.fuel,
      drivetrain: l.drivetrain,
      engine: l.engine,
      extColor: l.extColor,
      intColor: l.intColor,
      doors: l.doors,
      seats: l.seats,
      description: l.description,
      // El inventario del dealer está en su local.
      province: job.dealer.province,
      lat: job.dealer.lat,
      lng: job.dealer.lng,
      status: "DRAFT",
      sourceUrl: l.sourceUrl,
      photos: { create: photos.map((url, position) => ({ url, position })) },
      features: { create: features.map((f) => ({ featureId: f.id })) },
    },
    select: { id: true },
  });
  return { status: "DONE" as const, error: photos.length ? null : "Sin fotos: agrégalas antes de publicar.", title: l.title, vehicleId: vehicle.id };
}
