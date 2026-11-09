import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { saveSocialImage } from "@/lib/upload";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { CONDITION_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice } from "@/lib/labels";
import type { SocialNetwork } from "@/generated/prisma/enums";
import { DEFAULT_DESIGN, parseDesign, type AdData, type AdDesign } from "./design";
import { DEFAULT_CAPTION, fillCaption, socialLink } from "./caption";
import { openSecret, sealSecret } from "./crypto";
import { MetaError, type MetaPage, isMetaConfigured, publishFacebookPhoto, publishInstagram } from "./meta";
import { renderAdImage } from "./render";

export { syncMetrics } from "./metrics";

/** Datos de SocialAccount para la página de Facebook conectada (y su Instagram vinculado). */
export function connectedPage(page: MetaPage) {
  return { pageId: page.id, pageName: page.name, pageToken: sealSecret(page.token), igUserId: page.igId, igUsername: page.igUsername, pendingPages: null, connectedAt: new Date(), needsReconnect: false };
}

/** El dealer tiene un plan activo que incluye el módulo de redes sociales. */
export async function socialEnabled(dealerId: string | null) {
  if (!dealerId) return false;
  const count = await db.subscription.count({ where: { dealerId, status: "ACTIVE", endsAt: { gt: new Date() }, plan: { socialModule: true } } });
  return count > 0;
}

const adInclude = {
  model: { include: { brand: true } },
  photos: { orderBy: { position: "asc" as const } },
  dealer: { select: { id: true, name: true, logoUrl: true, phone: true, whatsapp: true, socialAccount: true } },
  socialAd: true,
};

type AdVehicle = NonNullable<Awaited<ReturnType<typeof findAdVehicle>>>;
const findAdVehicle = (id: string) => db.vehicle.findUnique({ where: { id }, include: adInclude });

export function toAdData(v: AdVehicle): AdData {
  return {
    brand: v.model.brand.name,
    model: v.model.name,
    title: vehicleTitle(v),
    year: v.year,
    trim: v.trim,
    price: formatPrice(v.price, v.currency),
    priceBefore: v.priceBefore ? formatPrice(v.priceBefore, v.currency) : null,
    mileage: formatKm(v.mileageKm),
    condition: CONDITION_LABEL[v.condition],
    transmission: TRANSMISSION_LABEL[v.transmission],
    fuel: FUEL_LABEL[v.fuel],
    province: v.province,
    dealerName: v.dealer?.name ?? "",
    logoUrl: v.dealer?.logoUrl ?? null,
    phone: v.dealer?.whatsapp || v.dealer?.phone || null,
    photos: v.photos.map((p) => p.url),
  };
}

/** Diseño y texto del anuncio de un vehículo: el suyo, o el del dealer por defecto. */
export function adDefaults(v: AdVehicle): { design: AdDesign; caption: string } {
  const account = v.dealer?.socialAccount;
  const base = parseDesign(account?.defaultDesign ?? null, DEFAULT_DESIGN);
  return {
    design: v.socialAd ? parseDesign(v.socialAd.design, base) : base,
    caption: v.socialAd?.caption ?? account?.captionTemplate ?? DEFAULT_CAPTION,
  };
}

export async function loadAd(vehicleId: string) {
  const v = await findAdVehicle(vehicleId);
  if (!v) return null;
  return { vehicle: v, data: toAdData(v), ...adDefaults(v) };
}

export type PublishResult = { network: SocialNetwork; ok: boolean; error?: string; permalink?: string | null };

/**
 * Genera la imagen del anuncio y la publica en las redes indicadas de la página conectada del dealer.
 * Cada red queda registrada como SocialPost, también cuando falla, para verla en el panel.
 */
export async function publishVehicle(vehicleId: string, networks: SocialNetwork[], override?: { design: AdDesign; caption: string }): Promise<PublishResult[]> {
  const ad = await loadAd(vehicleId);
  const account = ad?.vehicle.dealer?.socialAccount;
  if (!ad || !ad.vehicle.dealerId || !account?.pageId || !account.pageToken) throw new Error("Conecta la página de Facebook del dealer antes de publicar.");
  if (!isMetaConfigured()) throw new Error("La conexión con Meta no está configurada en el portal.");
  if (ad.vehicle.status !== "ACTIVE") throw new Error("Solo se publican en redes los vehículos publicados en el portal.");
  if (!ad.data.photos.length) throw new Error("El vehículo no tiene fotos.");
  const dealerId = ad.vehicle.dealerId;

  const design = override?.design ?? ad.design;
  const captionTemplate = override?.caption ?? ad.caption;
  const imageUrl = await saveSocialImage(await renderAdImage(design, ad.data));
  const publicImage = siteUrl(imageUrl);
  const token = openSecret(account.pageToken);
  const story = design.format === "story";
  const portalUrl = siteUrl(vehicleUrl(ad.vehicle));

  const results: PublishResult[] = [];
  for (const network of networks) {
    if (network === "INSTAGRAM" && !account.igUserId) {
      results.push({ network, ok: false, error: "La página no tiene una cuenta de Instagram profesional vinculada." });
      continue;
    }
    const caption = fillCaption(captionTemplate, ad.data, socialLink(portalUrl, network));
    const post = await db.socialPost.create({ data: { vehicleId, dealerId, network, format: design.format, story: story && network === "INSTAGRAM", imageUrl, caption } });
    try {
      const published =
        network === "FACEBOOK" ? await publishFacebookPhoto(account.pageId, token, publicImage, caption) : await publishInstagram(account.igUserId!, token, publicImage, caption, story);
      await db.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHED", remoteId: published.id, permalink: published.permalink, publishedAt: new Date() } });
      results.push({ network, ok: true, permalink: published.permalink });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error(`[redes] ${network} ${vehicleId}:`, message);
      await db.socialPost.update({ where: { id: post.id }, data: { status: "FAILED", error: message.slice(0, 500) } });
      if (error instanceof MetaError && error.expired) await db.socialAccount.update({ where: { dealerId }, data: { needsReconnect: true } });
      results.push({ network, ok: false, error: message });
    }
  }
  return results;
}

/**
 * Publicación automática: la primera vez que un vehículo de un dealer con el módulo pasa a publicado.
 * Se llama con `after()` para no demorar al vendedor; los errores quedan en SocialPost.
 */
export async function autoPublishVehicle(vehicleId: string) {
  try {
    const v = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { dealerId: true, status: true, dealer: { select: { socialAccount: true } } } });
    const account = v?.dealer?.socialAccount;
    if (!v?.dealerId || v.status !== "ACTIVE" || !account?.autoPublish || !account.pageToken || account.needsReconnect || !isMetaConfigured()) return;
    if (!(await socialEnabled(v.dealerId))) return;
    if (await db.socialPost.count({ where: { vehicleId, status: { in: ["PENDING", "PUBLISHED"] } } })) return;
    const networks: SocialNetwork[] = [...(account.publishFacebook ? ["FACEBOOK" as const] : []), ...(account.publishInstagram && account.igUserId ? ["INSTAGRAM" as const] : [])];
    if (networks.length) await publishVehicle(vehicleId, networks);
  } catch (error) {
    console.error("[redes] publicación automática", vehicleId, error);
  }
}
