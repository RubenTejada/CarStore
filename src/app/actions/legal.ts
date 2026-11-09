"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, homeFor, requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { legalFields, legalRequestSchema } from "@/lib/legal-validation";
import { LEGAL_VERSION } from "@/lib/legal";
import { takeToken } from "@/lib/rate-limit";
import type { FormState } from "./auth";

export async function acceptAccountTerms(_: FormState, form: FormData): Promise<FormState> {
  // No usar requireUser: las cuentas con aceptación pendiente llegan a esta acción.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = z.object(legalFields).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { legalVersion: LEGAL_VERSION } }),
    db.legalAcceptance.create({ data: { userId: user.id, kind: "ACCOUNT", version: LEGAL_VERSION } }),
  ]);
  redirect(homeFor(user.role));
}

export async function submitLegalRequest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = legalRequestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  if (!takeToken(`legal:${ip}`, 5, 3_600_000)) return { error: "Has enviado varias solicitudes. Intenta de nuevo más tarde o usa el correo legal, si figura en Información legal." };
  const { kind, name, email, reference, message } = parsed.data;
  const request = await db.legalRequest.create({ data: { kind, name, email, reference: reference || null, message, version: LEGAL_VERSION } });
  revalidatePath("/admin/legal");
  return { ok: `Solicitud registrada. Conserva la referencia ${request.id}. La administración revisará tu solicitud y podrá contactarte en el correo indicado. No se ha enviado una confirmación por correo.` };
}

export async function reviewLegalRequest(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = z.string().trim().min(20, "Documenta la actuación y la respuesta al solicitante (mínimo 20 caracteres).").max(4000).safeParse(form.get("reviewNote"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { count } = await db.legalRequest.updateMany({ where: { id, reviewedAt: null }, data: { reviewedAt: new Date(), reviewedBy: user.id, reviewNote: parsed.data } });
  if (!count) return { error: "La solicitud no existe o ya fue atendida." };
  revalidatePath("/admin/legal");
  return { ok: "Actuación registrada. Esta acción no envía correos al solicitante." };
}
