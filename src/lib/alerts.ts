/**
 * Alertas diarias por correo (scripts/send-alerts.ts, GitHub Actions): a cada comprador con el correo
 * confirmado y las alertas activas, un resumen con los vehículos publicados desde la última revisión
 * que coinciden con sus búsquedas guardadas y las rebajas de los vehículos que guardó.
 * Sin dependencias de Next.
 */
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { alertDigestTemplate, type AlertVehicle } from "@/lib/email-templates";
import { formatKm } from "@/lib/labels";
import { priceDrop } from "@/lib/price-drop";
import { buildWhere, parseSearchParams } from "@/lib/search-params";
import { siteUrl } from "@/lib/seo";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";

/** Vehículos por búsqueda en el correo; el resto, con el enlace a la búsqueda. */
const PER_SEARCH = 5;

const alertSelect = {
  id: true,
  year: true,
  price: true,
  currency: true,
  priceBefore: true,
  priceDropAt: true,
  mileageKm: true,
  condition: true,
  province: true,
  model: { select: { name: true, brand: { select: { name: true } } } },
} as const;

type Row = { id: string; year: number; price: number; currency: "DOP" | "USD"; priceBefore: number | null; priceDropAt: Date | null; mileageKm: number; condition: "NEW" | "USED"; province: string; model: { name: string; brand: { name: string } } };

function toAlertVehicle(v: Row, drop?: number): AlertVehicle {
  return {
    title: `${vehicleTitle(v)} ${v.year}`,
    url: siteUrl(vehicleUrl(v)),
    price: v.price,
    currency: v.currency,
    detail: [v.condition === "NEW" ? "Nuevo" : formatKm(v.mileageKm), v.province].join(", "),
    ...(drop && { before: v.price + drop }),
  };
}

export type AlertsSummary = { users: number; sent: number; failed: number };

export async function sendAlerts(now = new Date()): Promise<AlertsSummary> {
  const users = await db.user.findMany({
    where: { active: true, alertsEnabled: true, emailVerifiedAt: { not: null }, OR: [{ savedSearches: { some: {} } }, { savedVehicles: { some: {} } }] },
    select: {
      id: true,
      name: true,
      email: true,
      alertsToken: true,
      savedSearches: { orderBy: { createdAt: "asc" } },
      savedVehicles: {
        where: { vehicle: { status: "ACTIVE", priceDropAt: { not: null } } },
        select: { vehicleId: true, createdAt: true, notifiedDropAt: true, vehicle: { select: alertSelect } },
      },
    },
  });

  const summary: AlertsSummary = { users: users.length, sent: 0, failed: 0 };
  for (const user of users) {
    const searches = [];
    for (const s of user.savedSearches) {
      const where = { AND: [buildWhere(parseSearchParams(Object.fromEntries(new URLSearchParams(s.query)))), { publishedAt: { gt: s.lastCheckedAt, lte: now } }] };
      const [total, vehicles] = await Promise.all([
        db.vehicle.count({ where }),
        db.vehicle.findMany({ where, select: alertSelect, orderBy: { publishedAt: "desc" }, take: PER_SEARCH }),
      ]);
      if (total) searches.push({ name: s.name, url: siteUrl(`/vehiculos?${s.query}`), total, vehicles: vehicles.map((v) => toAlertVehicle(v)) });
    }
    // Rebajas nuevas: posteriores a guardarlo y al último aviso, y aún vigentes.
    const drops = user.savedVehicles.flatMap((sv) => {
      const drop = priceDrop(sv.vehicle, now);
      const since = sv.notifiedDropAt ?? sv.createdAt;
      return drop && sv.vehicle.priceDropAt! > since ? [{ vehicleId: sv.vehicleId, alert: toAlertVehicle(sv.vehicle, drop) }] : [];
    });

    if (searches.length || drops.length) {
      try {
        await sendEmail(
          {
            to: user.email,
            ...alertDigestTemplate({
              name: user.name,
              searches,
              drops: drops.map((d) => d.alert),
              accountUrl: siteUrl("/cuenta"),
              unsubscribeUrl: siteUrl(`/alertas/baja?token=${user.alertsToken}`),
            }),
            headers: { "List-Unsubscribe": `<${siteUrl(`/alertas/baja?token=${user.alertsToken}`)}>` },
          },
          { wait: true },
        );
        summary.sent++;
      } catch (error) {
        // No se marca como revisado: lo nuevo vuelve a salir en el próximo envío.
        summary.failed++;
        console.error(`[alertas] no se pudo enviar a ${user.id}:`, error);
        continue;
      }
    }
    await db.$transaction([
      db.savedSearch.updateMany({ where: { userId: user.id }, data: { lastCheckedAt: now } }),
      ...(drops.length ? [db.savedVehicle.updateMany({ where: { userId: user.id, vehicleId: { in: drops.map((d) => d.vehicleId) } }, data: { notifiedDropAt: now } })] : []),
    ]);
  }
  return summary;
}
