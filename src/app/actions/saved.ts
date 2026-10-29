"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { ID_RE } from "@/lib/compare";
import { MAX_SAVED, cleanIds } from "@/lib/saved";
import { MAX_SAVED_SEARCHES, savedSearchQuery } from "@/lib/saved-search";
import { parseSearchParams } from "@/lib/search-params";
import type { FormState } from "./auth";

/**
 * Guardados de la cuenta. Con `localIds` (la primera vez en este navegador) suma los del navegador;
 * devuelve la lista de la cuenta, que desde entonces manda. `null` sin sesión.
 */
export async function syncSaved(localIds: string[]): Promise<string[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const ids = cleanIds(Array.isArray(localIds) ? localIds : [], MAX_SAVED);
  if (ids.length) {
    const live = await db.vehicle.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: { id: true } });
    await db.savedVehicle.createMany({ data: live.map((v) => ({ userId: user.id, vehicleId: v.id })), skipDuplicates: true });
  }
  const rows = await db.savedVehicle.findMany({
    where: { userId: user.id, vehicle: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: MAX_SAVED,
    select: { vehicleId: true },
  });
  return rows.map((r) => r.vehicleId);
}

/** Guarda o quita un vehículo de la cuenta (el corazón ya cambió en el navegador). */
export async function setSaved(vehicleId: string, saved: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user || typeof vehicleId !== "string" || !ID_RE.test(vehicleId)) return;
  if (!saved) {
    await db.savedVehicle.deleteMany({ where: { userId: user.id, vehicleId } });
    return;
  }
  const exists = await db.vehicle.count({ where: { id: vehicleId, status: "ACTIVE" } });
  if (exists) await db.savedVehicle.createMany({ data: [{ userId: user.id, vehicleId }], skipDuplicates: true });
}

/** Guarda la búsqueda de /vehiculos para recibir alertas de vehículos nuevos. */
export async function saveSearch(query: string, name: string): Promise<FormState> {
  const user = await requireUser();
  const filters = parseSearchParams(Object.fromEntries(new URLSearchParams(String(query))));
  const canonical = savedSearchQuery(filters);
  if (!canonical) return { error: "Elige al menos un filtro para crear la alerta." };
  const existing = await db.savedSearch.findUnique({ where: { userId_query: { userId: user.id, query: canonical } }, select: { id: true } });
  if (!existing) {
    if ((await db.savedSearch.count({ where: { userId: user.id } })) >= MAX_SAVED_SEARCHES)
      return { error: `Puedes tener hasta ${MAX_SAVED_SEARCHES} búsquedas guardadas. Borra alguna en tu cuenta.` };
    await db.savedSearch.create({ data: { userId: user.id, query: canonical, name: String(name).trim().slice(0, 120) || "Mi búsqueda" } });
  }
  revalidatePath("/cuenta");
  return { ok: user.emailVerifiedAt ? "Alerta creada: te avisaremos por correo de los vehículos nuevos." : "Alerta creada. Confirma tu correo para recibir los avisos." };
}

export async function deleteSearch(id: string): Promise<FormState> {
  const user = await requireUser();
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/cuenta");
  return { ok: "Búsqueda eliminada." };
}
