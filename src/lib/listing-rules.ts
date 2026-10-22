import { db } from "@/lib/db";
import type { Role, DealerStatus } from "@/generated/prisma/enums";

type Actor = { id: string; role: Role; dealerId: string | null };

/** Plan sin costo ni vencimiento que aplica a toda cuenta sin un plan pagado activo. */
export const FREE_PLAN = { name: "Gratis", maxActiveListings: 5, featuredSlots: 0 } as const;
type Owned = { ownerId: string; dealerId: string | null };

/** Cuenta que consume el cupo: el dealer (compartido por sus usuarios) o el vendedor particular. */
export function accountScope(user: Actor) {
  return user.dealerId ? { dealerId: user.dealerId } : { ownerId: user.id, dealerId: null };
}

export function canEditVehicle(user: Actor, vehicle: Owned) {
  if (user.role === "ADMIN") return true;
  if (vehicle.dealerId) return vehicle.dealerId === user.dealerId;
  return vehicle.ownerId === user.id && !user.dealerId;
}

export type Quota = {
  planName: string;
  /** Vencimiento del plan pagado; `null` en el plan Gratis. */
  endsAt: Date | null;
  maxActive: number;
  usedActive: number;
  featuredSlots: number;
  usedFeatured: number;
  dealerStatus: DealerStatus | null;
};

/**
 * Valida si un vehículo puede quedar publicado / destacado con el cupo actual.
 * `wasActive` / `wasFeatured` indican si el vehículo ya consumía cupo.
 */
export function evaluatePublish(
  quota: Quota,
  change: { activate: boolean; featured: boolean; wasActive: boolean; wasFeatured: boolean },
): string | null {
  if (change.activate) {
    if (quota.dealerStatus && quota.dealerStatus !== "APPROVED")
      return "Tu dealer aún no está aprobado por la administración.";
    if (!change.wasActive && quota.usedActive >= quota.maxActive)
      return `Tu plan ${quota.planName} permite ${quota.maxActive} vehículos publicados. Pausa uno o mejora tu plan.`;
  }
  if (change.featured) {
    if (!change.activate) return "Solo un vehículo publicado puede ser destacado.";
    if (!change.wasFeatured && quota.usedFeatured >= quota.featuredSlots)
      return quota.featuredSlots === 0
        ? "Tu plan no incluye vehículos destacados."
        : `Tu plan permite ${quota.featuredSlots} destacados.`;
  }
  return null;
}

export async function getActiveSubscription(user: Actor) {
  const scope = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null };
  return db.subscription.findFirst({
    where: { ...scope, status: "ACTIVE", endsAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { plan: { maxActiveListings: "desc" } },
  });
}

export async function getQuota(user: Actor): Promise<Quota> {
  const scope = accountScope(user);
  const now = new Date();
  const [sub, usedActive, usedFeatured, dealer] = await Promise.all([
    getActiveSubscription(user),
    db.vehicle.count({ where: { ...scope, status: "ACTIVE" } }),
    db.vehicle.count({ where: { ...scope, status: "ACTIVE", featuredUntil: { gt: now } } }),
    user.dealerId ? db.dealer.findUnique({ where: { id: user.dealerId }, select: { status: true } }) : null,
  ]);
  return {
    planName: sub?.plan.name ?? FREE_PLAN.name,
    endsAt: sub?.endsAt ?? null,
    maxActive: sub?.plan.maxActiveListings ?? FREE_PLAN.maxActiveListings,
    usedActive,
    featuredSlots: sub?.plan.featuredSlots ?? FREE_PLAN.featuredSlots,
    usedFeatured,
    dealerStatus: dealer?.status ?? null,
  };
}

let lastSweep = 0;

/**
 * Marca suscripciones vencidas y devuelve al plan Gratis a las cuentas sin otro plan activo:
 * siguen publicados sus vehículos más recientes hasta el cupo gratis, sin destacados, y el resto se pausa.
 * Se ejecuta como máximo cada 10 minutos (sin cron en el MVP).
 */
export async function sweepExpiredSubscriptions(force = false) {
  if (!force && Date.now() - lastSweep < 10 * 60_000) return;
  lastSweep = Date.now();
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    select: { id: true, userId: true, dealerId: true },
  });
  if (!expired.length) return;
  await db.subscription.updateMany({
    where: { id: { in: expired.map((s) => s.id) } },
    data: { status: "EXPIRED" },
  });
  for (const s of expired) {
    const scope = s.dealerId ? { dealerId: s.dealerId } : { userId: s.userId, dealerId: null };
    const stillActive = await db.subscription.count({
      where: { ...scope, status: "ACTIVE", endsAt: { gt: now } },
    });
    if (stillActive) continue;
    const vehicles = s.dealerId ? { dealerId: s.dealerId } : { ownerId: s.userId, dealerId: null };
    const keep = await db.vehicle.findMany({
      where: { ...vehicles, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: FREE_PLAN.maxActiveListings,
      select: { id: true },
    });
    await db.$transaction([
      db.vehicle.updateMany({
        where: { ...vehicles, status: "ACTIVE", id: { notIn: keep.map((v) => v.id) } },
        data: { status: "PAUSED" },
      }),
      db.vehicle.updateMany({ where: { ...vehicles, featuredUntil: { not: null } }, data: { featuredUntil: null } }),
    ]);
  }
}
