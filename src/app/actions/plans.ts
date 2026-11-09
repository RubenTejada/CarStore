"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { FormState } from "./auth";
import { legalFields } from "@/lib/legal-validation";
import { LEGAL_VERSION, legalOperatorReady } from "@/lib/legal";
import { planOfferSchema, samePlanOffer } from "@/lib/plan-offer";

const schema = z.object({
  ...legalFields,
  planOffer: planOfferSchema,
  paymentRef: z.string().trim().min(3, "Escribe el número de referencia de la transferencia").max(60),
});

/** Solicita un plan: queda PENDIENTE hasta que la administración confirme el pago. */
export async function requestPlan(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER", "SELLER");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!legalOperatorReady()) return { error: "Los planes pagados no están disponibles hasta que se complete la identificación y el contacto legal del operador. No realices transferencias." };
  const plan = await db.plan.findUnique({ where: { id: parsed.data.planOffer.id } });
  if (!plan || !plan.active) return { error: "Plan no disponible." };
  if (!samePlanOffer(parsed.data.planOffer, plan)) return { error: "Las condiciones del plan cambiaron. Recarga la página y revísalas antes de solicitarlo. Si ya pagaste, registra una reclamación." };
  if (plan.forDealers !== !!user.dealerId)
    return { error: plan.forDealers ? "Este plan es solo para dealers." : "Los dealers deben elegir un plan de dealer." };
  const scope = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null };
  if (await db.subscription.count({ where: { ...scope, status: "PENDING" } }))
    return { error: "Ya tienes una solicitud pendiente. Espera la confirmación del pago." };
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({ data: { planId: plan.id, userId: user.id, dealerId: user.dealerId, paymentRef: parsed.data.paymentRef } });
    await tx.legalAcceptance.create({ data: { userId: user.id, kind: "PLAN", version: LEGAL_VERSION, subjectId: subscription.id, details: { planId: plan.id, name: plan.name, priceDop: plan.priceDop, durationDays: plan.durationDays, maxActiveListings: plan.maxActiveListings, featuredSlots: plan.featuredSlots, officialSite: plan.officialSite, socialModule: plan.socialModule } } });
  });
  revalidatePath("/panel/planes");
  return { ok: "Solicitud enviada. Activaremos tu plan cuando confirmemos el pago." };
}
