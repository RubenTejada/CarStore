"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { FormState } from "./auth";

const schema = z.object({
  planId: z.string().min(1),
  paymentRef: z.string().trim().min(3, "Escribe el número de referencia de la transferencia").max(60),
});

/** Solicita un plan: queda PENDIENTE hasta que la administración confirme el pago. */
export async function requestPlan(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER", "SELLER");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const plan = await db.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan || !plan.active) return { error: "Plan no disponible." };
  if (plan.forDealers !== !!user.dealerId)
    return { error: plan.forDealers ? "Este plan es solo para dealers." : "Los dealers deben elegir un plan de dealer." };
  const scope = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null };
  if (await db.subscription.count({ where: { ...scope, status: "PENDING" } }))
    return { error: "Ya tienes una solicitud pendiente. Espera la confirmación del pago." };
  await db.subscription.create({ data: { planId: plan.id, userId: user.id, dealerId: user.dealerId, paymentRef: parsed.data.paymentRef } });
  revalidatePath("/panel/planes");
  return { ok: "Solicitud enviada. Activaremos tu plan cuando confirmemos el pago." };
}
