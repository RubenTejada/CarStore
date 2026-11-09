// Lee de Meta las métricas de las publicaciones. Sin dependencias de Next: lo usan el panel
// («Actualizar métricas») y el trabajo programado (scripts/social-metrics.ts).
import { db } from "@/lib/db";
import { openSecret } from "./crypto";
import { MetaError, facebookMetrics, instagramMetrics, isMetaConfigured } from "./meta";

/** Actualiza las métricas de las publicaciones de los últimos 90 días que no se leyeron en `staleMs`. */
export async function syncMetrics({ dealerId, staleMs = 3 * 3_600_000, limit = 200 }: { dealerId?: string; staleMs?: number; limit?: number } = {}) {
  if (!isMetaConfigured()) return { updated: 0, failed: 0 };
  const now = Date.now();
  const posts = await db.socialPost.findMany({
    where: {
      ...(dealerId && { dealerId }),
      status: "PUBLISHED",
      remoteId: { not: null },
      publishedAt: { gte: new Date(now - 90 * 86_400_000) },
      OR: [{ metricsAt: null }, { metricsAt: { lt: new Date(now - staleMs) } }],
      dealer: { socialAccount: { pageToken: { not: null }, needsReconnect: false } },
    },
    orderBy: { metricsAt: { sort: "asc", nulls: "first" } },
    take: limit,
    include: { dealer: { select: { socialAccount: { select: { pageToken: true } } } } },
  });
  let updated = 0;
  let failed = 0;
  for (const p of posts) {
    try {
      const token = openSecret(p.dealer.socialAccount!.pageToken!);
      const m = p.network === "FACEBOOK" ? await facebookMetrics(p.remoteId!, token) : await instagramMetrics(p.remoteId!, token);
      await db.socialPost.update({ where: { id: p.id }, data: { ...m, permalink: m.permalink ?? p.permalink, metricsAt: new Date() } });
      updated++;
    } catch (error) {
      failed++;
      console.error("[redes] métricas", p.id, error instanceof Error ? error.message : error);
      if (error instanceof MetaError && error.expired) await db.socialAccount.update({ where: { dealerId: p.dealerId }, data: { needsReconnect: true } });
      // Que una publicación borrada en Meta no se intente en cada corrida.
      await db.socialPost.update({ where: { id: p.id }, data: { metricsAt: new Date() } });
    }
  }
  return { updated, failed };
}
