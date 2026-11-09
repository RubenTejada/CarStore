"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { FormState } from "./auth";
import { legalFields } from "@/lib/legal-validation";
import { LEGAL_VERSION, legalOperatorReady } from "@/lib/legal";
import { planOfferSchema, samePlanOffer } from "@/lib/plan-offer";
import { getUsdRate } from "@/lib/exchange-rate";
import { formatUsdCents } from "@/lib/labels";

const schema = z.object({
  ...legalFields,
  planOffer: planOfferSchema,
  method: z.enum(["TRANSFER", "PAYONEER_LINK"]).default("TRANSFER"),
  paymentRef: z.string().trim().max(60).optional(),
});

/**
 * Solicita un plan: queda PENDIENTE hasta que la administración confirme el pago.
 * Por transferencia el cliente escribe la referencia; con tarjeta, el operador le envía por correo una
 * solicitud de pago de Payoneer por el importe en USD calculado aquí (`chargeUsdCents`).
 */
export async function requestPlan(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER", "SELLER");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { method } = parsed.data;
  const paymentRef = method === "TRANSFER" ? (parsed.data.paymentRef ?? "") : null;
  if (paymentRef !== null && paymentRef.length < 3) return { error: "Escribe el número de referencia de la transferencia" };
  if (!legalOperatorReady()) return { error: "Los planes pagados no están disponibles hasta que se complete la identificación y el contacto legal del operador. No realices transferencias." };
  const plan = await db.plan.findUnique({ where: { id: parsed.data.planOffer.id } });
  if (!plan || !plan.active) return { error: "Plan no disponible." };
  if (!samePlanOffer(parsed.data.planOffer, plan)) return { error: "Las condiciones del plan cambiaron. Recarga la página y revísalas antes de solicitarlo. Si ya pagaste, registra una reclamación." };
  if (plan.forDealers !== !!user.dealerId)
    return { error: plan.forDealers ? "Este plan es solo para dealers." : "Los dealers deben elegir un plan de dealer." };
  const scope = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null };
  if (await db.subscription.count({ where: { ...scope, status: "PENDING" } }))
    return { error: "Ya tienes una solicitud pendiente. Espera la confirmación del pago." };

  const usdDop = method === "PAYONEER_LINK" ? (await getUsdRate()).rate : null;
  const chargeUsdCents = usdDop ? Math.round((plan.priceDop / usdDop) * 100) : null;
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({ data: { planId: plan.id, userId: user.id, dealerId: user.dealerId, paymentMethod: method, paymentRef, chargeUsdCents } });
    const benefits = { planId: plan.id, name: plan.name, priceDop: plan.priceDop, durationDays: plan.durationDays, maxActiveListings: plan.maxActiveListings, featuredSlots: plan.featuredSlots, officialSite: plan.officialSite, socialModule: plan.socialModule };
    await tx.legalAcceptance.create({ data: { userId: user.id, kind: "PLAN", version: LEGAL_VERSION, subjectId: subscription.id, details: chargeUsdCents ? { ...benefits, payment: { method, chargeUsdCents, usdDop } } : benefits } });
  });
  revalidatePath("/panel/planes");
  return {
    ok: chargeUsdCents
      ? `Solicitud enviada. Te enviaremos a ${user.email} una solicitud de pago de Payoneer por ${formatUsdCents(chargeUsdCents)}; el plan se activa cuando recibamos el pago.`
      : "Solicitud enviada. Activaremos tu plan cuando confirmemos el pago.",
  };
}
