"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { takeToken } from "@/lib/rate-limit";
import { CLAUDE_MODEL, getClaudeClient, isClaudeConfigured, refusalFallback } from "@/lib/claude";
import { designSchema, type AdDesign } from "@/lib/social/design";
import { CAPTION_MAX } from "@/lib/social/caption";
import { openSecret } from "@/lib/social/crypto";
import type { MetaPage } from "@/lib/social/meta";
import { connectedPage, loadAd, publishVehicle, socialEnabled, syncMetrics, type PublishResult } from "@/lib/social/service";
import type { FormState } from "./auth";

/** Usuario de un dealer cuyo plan incluye el módulo de redes. */
async function socialDealer() {
  const user = await requireUser("DEALER");
  if (!user.dealerId) throw new Error("Solo los dealers tienen el módulo de redes sociales.");
  if (!(await socialEnabled(user.dealerId))) throw new Error("Tu plan no incluye el módulo de redes sociales.");
  return { user, dealerId: user.dealerId };
}

async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error; // redirect()
    return { error: error instanceof Error ? error.message : "No se pudo completar la acción." };
  }
}

const caption = z.string().max(CAPTION_MAX, `El texto admite hasta ${CAPTION_MAX} caracteres.`);
const adInput = z.object({ design: designSchema, caption });
const networksInput = z.array(z.enum(["FACEBOOK", "INSTAGRAM"])).min(1, "Elige al menos una red.").max(2);

async function editableVehicle(vehicleId: string) {
  const ctx = await socialDealer();
  const v = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { ownerId: true, dealerId: true } });
  if (!v || v.dealerId !== ctx.dealerId || !canEditVehicle(ctx.user, v)) throw new Error("No tienes permiso para este vehículo.");
  return ctx;
}

export async function saveVehicleAd(vehicleId: string, input: { design: AdDesign; caption: string }): Promise<FormState> {
  return guard(async () => {
    await editableVehicle(vehicleId);
    const parsed = adInput.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { design, caption } = parsed.data;
    await db.socialAd.upsert({ where: { vehicleId }, create: { vehicleId, design, caption }, update: { design, caption } });
    revalidatePath(`/panel/vehiculos/${vehicleId}/redes`);
    return { ok: "Anuncio guardado." };
  });
}

/** Vuelve al diseño por defecto del dealer. */
export async function resetVehicleAd(vehicleId: string): Promise<FormState> {
  return guard(async () => {
    await editableVehicle(vehicleId);
    await db.socialAd.deleteMany({ where: { vehicleId } });
    revalidatePath(`/panel/vehiculos/${vehicleId}/redes`);
    return { ok: "Se aplicó el diseño por defecto del dealer." };
  });
}

export async function publishVehicleAd(vehicleId: string, input: { design: AdDesign; caption: string; networks: string[] }): Promise<{ error?: string; ok?: string; results?: PublishResult[] }> {
  return guard(async () => {
    const { user } = await editableVehicle(vehicleId);
    const parsed = adInput.safeParse(input);
    const networks = networksInput.safeParse(input.networks);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    if (!networks.success) return { error: networks.error.issues[0].message };
    if (!takeToken(`social-publish:${user.id}`, 30, 3_600_000)) return { error: "Publicaste muchas veces seguidas. Intenta de nuevo en un rato." };
    const { design, caption } = parsed.data;
    await db.socialAd.upsert({ where: { vehicleId }, create: { vehicleId, design, caption }, update: { design, caption } });
    const results = await publishVehicle(vehicleId, networks.data, { design, caption });
    revalidatePath("/panel/redes");
    revalidatePath(`/panel/vehiculos/${vehicleId}/redes`);
    const ok = results.filter((r) => r.ok).length;
    return ok === results.length ? { ok: "Publicado en redes.", results } : { error: results.find((r) => !r.ok)?.error ?? "No se pudo publicar.", results };
  });
}

export async function saveDefaultAd(input: { design: AdDesign; caption: string }): Promise<FormState> {
  return guard(async () => {
    const { dealerId } = await socialDealer();
    const parsed = adInput.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    // Las fotos se eligen por vehículo; el diseño por defecto no guarda ninguna.
    const design = { ...parsed.data.design, photos: [] };
    await db.socialAccount.upsert({ where: { dealerId }, create: { dealerId, defaultDesign: design, captionTemplate: parsed.data.caption }, update: { defaultDesign: design, captionTemplate: parsed.data.caption } });
    revalidatePath("/panel/redes", "layout");
    return { ok: "Diseño por defecto guardado. Lo usarán los vehículos sin anuncio propio." };
  });
}

const settingsSchema = z.object({ autoPublish: z.boolean(), publishFacebook: z.boolean(), publishInstagram: z.boolean() });

export async function saveSocialSettings(_: FormState, form: FormData): Promise<FormState> {
  return guard(async () => {
    const { dealerId } = await socialDealer();
    const data = settingsSchema.parse({ autoPublish: form.get("autoPublish") === "on", publishFacebook: form.get("publishFacebook") === "on", publishInstagram: form.get("publishInstagram") === "on" });
    await db.socialAccount.upsert({ where: { dealerId }, create: { dealerId, ...data }, update: data });
    revalidatePath("/panel/redes");
    return { ok: "Preferencias guardadas." };
  });
}

/** Conecta la página elegida entre las que devolvió la autorización de Meta. */
export async function selectSocialPage(pageId: string): Promise<FormState> {
  return guard(async () => {
    const { dealerId } = await socialDealer();
    const account = await db.socialAccount.findUnique({ where: { dealerId }, select: { pendingPages: true } });
    const pages = account?.pendingPages ? (JSON.parse(openSecret(account.pendingPages)) as MetaPage[]) : [];
    const page = pages.find((p) => p.id === pageId);
    if (!page) return { error: "La autorización venció. Vuelve a conectar con Facebook." };
    await db.socialAccount.update({ where: { dealerId }, data: connectedPage(page) });
    revalidatePath("/panel/redes");
    return { ok: `Conectado a ${page.name}.` };
  });
}

export async function disconnectSocial(): Promise<FormState> {
  return guard(async () => {
    const user = await requireUser("DEALER");
    if (!user.dealerId) return { error: "Solo los dealers pueden conectar redes." };
    await db.socialAccount.updateMany({
      where: { dealerId: user.dealerId },
      data: { pageId: null, pageName: null, pageToken: null, igUserId: null, igUsername: null, pendingPages: null, connectedAt: null, needsReconnect: false },
    });
    revalidatePath("/panel/redes");
    return { ok: "Se desconectaron Facebook e Instagram. Puedes quitar también el acceso del portal en la configuración de tu cuenta de Facebook." };
  });
}

export async function refreshSocialMetrics(): Promise<FormState> {
  return guard(async () => {
    const { user, dealerId } = await socialDealer();
    if (!takeToken(`social-metrics:${user.id}`, 6, 3_600_000)) return { error: "Las métricas se actualizaron hace poco. Intenta más tarde." };
    const { updated, failed } = await syncMetrics({ dealerId, staleMs: 10 * 60_000, limit: 100 });
    revalidatePath("/panel/redes");
    return failed && !updated ? { error: "Meta no devolvió las métricas. Revisa la conexión." } : { ok: updated ? `Se actualizaron ${updated} publicaciones.` : "Las métricas ya estaban al día." };
  });
}

const TONES = {
  vendedor: "entusiasta y persuasivo, con sentido de urgencia sin exagerar",
  formal: "profesional y sobrio, para un público exigente",
  cercano: "cercano y conversacional, como habla un vendedor dominicano de confianza",
  lujo: "elegante y aspiracional, propio de una marca premium",
} as const;
export type CaptionTone = keyof typeof TONES;

/** Redacta el texto de la publicación con Claude; deja {enlace} y {hashtags} para completarlos al publicar. */
export async function suggestCaption(vehicleId: string, tone: CaptionTone): Promise<{ text?: string; error?: string }> {
  return guard(async () => {
    const { user } = await editableVehicle(vehicleId);
    if (!isClaudeConfigured()) return { error: "La redacción automática no está disponible en este momento." };
    if (!(tone in TONES)) return { error: "Tono inválido." };
    if (!takeToken(`social-caption:${user.id}`, 20, 3_600_000)) return { error: "Pediste muchos textos seguidos. Intenta de nuevo en un rato." };
    const ad = await loadAd(vehicleId);
    if (!ad) return { error: "No se encontró el vehículo." };
    const d = ad.data;
    const facts = [
      `Vehículo: ${d.title} ${d.year}${d.trim ? ` ${d.trim}` : ""} (${d.condition})`,
      `Precio: ${d.price}${d.priceBefore ? ` (antes ${d.priceBefore})` : ""}`,
      `Kilometraje: ${d.mileage}; transmisión ${d.transmission}; combustible ${d.fuel}`,
      `Ubicación: ${d.province}; dealer: ${d.dealerName}${d.phone ? `; teléfono ${d.phone}` : ""}`,
      ad.vehicle.description ? `Descripción del dealer: ${ad.vehicle.description.slice(0, 1500)}` : "",
    ].filter(Boolean);
    const msg = await getClaudeClient().beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2_000,
      ...refusalFallback(),
      output_config: { effort: "low" },
      system: `Escribes el texto de publicaciones de Facebook e Instagram para dealers de vehículos en República Dominicana, en español dominicano neutro. Tono: ${TONES[tone]}. Usa solo los datos dados, sin inventar equipamiento, garantías ni condiciones de financiamiento. Entre 60 y 120 palabras, párrafos cortos y algunos emojis. Termina con una línea que diga exactamente «Fotos y detalles: {enlace}» y, al final, una línea con exactamente «{hashtags}». Devuelve solo el texto de la publicación.`,
      messages: [{ role: "user", content: facts.join("\n") }],
    });
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (msg.stop_reason === "refusal" || !text) return { error: "No se pudo redactar el texto. Intenta de nuevo." };
    return { text: text.slice(0, CAPTION_MAX) };
  });
}
