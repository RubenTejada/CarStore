import type { Plan } from "@/generated/prisma/client";

export type PlanSpec = Pick<Plan, "name" | "description" | "priceDop" | "maxActiveListings" | "featuredSlots" | "durationDays" | "forDealers" | "officialSite" | "socialModule">;

/**
 * Planes pagados que ofrece el portal. El plan Gratis no es un registro (ver FREE_PLAN).
 * El seed los crea en desarrollo; en producción los aplica scripts/sync-plans.ts.
 */
export const PLAN_CATALOG: PlanSpec[] = [
  { name: "Pro", description: "Más vehículos y destacados en la portada.", priceDop: 500, maxActiveListings: 15, featuredSlots: 2, durationDays: 60, forDealers: false, officialSite: false, socialModule: false },
  { name: "Dealer Estándar", description: "Inventario mediano con perfil de dealer y mapa.", priceDop: 3_500, maxActiveListings: 40, featuredSlots: 3, durationDays: 30, forDealers: true, officialSite: false, socialModule: false },
  { name: "Dealer Plus", description: "Más inventario y más destacados en la portada.", priceDop: 5_500, maxActiveListings: 80, featuredSlots: 6, durationDays: 30, forDealers: true, officialSite: false, socialModule: false },
  { name: "Dealer Premium", description: "Inventario amplio y máxima visibilidad en la portada.", priceDop: 7_500, maxActiveListings: 150, featuredSlots: 12, durationDays: 30, forDealers: true, officialSite: false, socialModule: true },
  { name: "Página Oficial", description: "Tu inventario con tu marca: tu logo y tu propio dominio.", priceDop: 10_000, maxActiveListings: 250, featuredSlots: 20, durationDays: 30, forDealers: true, officialSite: true, socialModule: true },
];

/** Lo que el cliente contrata: si cambia y el plan tiene solicitudes o períodos vigentes, va en un plan nuevo. */
const CONTRACT_FIELDS = ["priceDop", "maxActiveListings", "featuredSlots", "durationDays", "forDealers", "officialSite", "socialModule"] as const;

export const contractChanged = (a: Pick<PlanSpec, (typeof CONTRACT_FIELDS)[number]>, b: Pick<PlanSpec, (typeof CONTRACT_FIELDS)[number]>) => CONTRACT_FIELDS.some((k) => a[k] !== b[k]);

export type CurrentPlan = PlanSpec & { id: string; openSubscriptions: number };

export type PlanSyncStep =
  | { kind: "keep"; current: CurrentPlan }
  | { kind: "create"; spec: PlanSpec }
  /** Sin solicitudes ni períodos vigentes, o solo cambia la descripción: se edita el mismo registro. */
  | { kind: "update"; current: CurrentPlan; spec: PlanSpec }
  /** Tiene contratos vigentes: se desactiva (los contratos siguen) y se crea uno nuevo con las condiciones del catálogo. */
  | { kind: "replace"; current: CurrentPlan; spec: PlanSpec }
  /** Plan activo que no está en el catálogo: deja de ofrecerse; sus contratos siguen. */
  | { kind: "deactivate"; current: CurrentPlan };

/** Pasos para que los planes activos queden como el catálogo, emparejados por nombre. */
export function planSync(active: CurrentPlan[], catalog: PlanSpec[] = PLAN_CATALOG): PlanSyncStep[] {
  const pending = [...active];
  const steps: PlanSyncStep[] = catalog.map((spec) => {
    const i = pending.findIndex((p) => p.name === spec.name);
    if (i < 0) return { kind: "create", spec };
    const [current] = pending.splice(i, 1);
    if (contractChanged(current, spec)) return { kind: current.openSubscriptions ? "replace" : "update", current, spec };
    return current.description === spec.description ? { kind: "keep", current } : { kind: "update", current, spec };
  });
  return [...steps, ...pending.map((current) => ({ kind: "deactivate" as const, current }))];
}
