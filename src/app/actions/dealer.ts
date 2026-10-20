"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";
import { PROVINCE_NAMES } from "@/lib/provinces";
import type { FormState } from "./auth";

const uploadedOrEmpty = z
  .string()
  .refine((u) => u === "" || /^\/uploads\/\d{4}-\d{2}\/[a-f0-9]{24}\.webp$/.test(u) || u.startsWith("https://images.unsplash.com/"), "Imagen inválida")
  .transform((u) => u || null);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const dealerSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del dealer").max(80),
  description: text(1500),
  phone: text(20),
  whatsapp: text(20),
  email: z.union([z.literal(""), z.string().trim().email("Correo inválido")]).transform((v) => v || null),
  website: z.union([z.literal(""), z.string().trim().url("Sitio web inválido (incluye https://)")]).transform((v) => v || null),
  hours: text(120),
  address: text(160),
  province: z.string().refine((p) => PROVINCE_NAMES.includes(p), "Selecciona la provincia"),
  lat: z.coerce.number().min(17.3).max(20.1, "La ubicación debe estar en República Dominicana"),
  lng: z.coerce.number().min(-72.1).max(-68.2, "La ubicación debe estar en República Dominicana"),
  logoUrl: uploadedOrEmpty,
  coverUrl: uploadedOrEmpty,
});

/** Actualiza el perfil del dealer del usuario (o cualquiera, si es admin). */
export async function updateDealer(dealerId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER", "ADMIN");
  if (user.role !== "ADMIN" && user.dealerId !== dealerId) return { error: "No tienes permiso para editar este dealer." };
  const parsed = dealerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.dealer.update({ where: { id: dealerId }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: "Perfil del dealer guardado." };
}

const memberSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
});

export async function addTeamMember(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("DEALER");
  if (!user.dealerId) return { error: "Tu cuenta no pertenece a un dealer." };
  const parsed = memberSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return { error: "Ya existe una cuenta con ese correo." };
  await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: "DEALER", dealerId: user.dealerId },
  });
  revalidatePath("/panel/equipo");
  return { ok: `${parsed.data.name} ya puede iniciar sesión y administrar el inventario.` };
}

export async function removeTeamMember(memberId: string): Promise<FormState> {
  const user = await requireUser("DEALER");
  if (memberId === user.id) return { error: "No puedes eliminar tu propia cuenta." };
  const member = await db.user.findUnique({ where: { id: memberId }, select: { dealerId: true } });
  if (!member || !user.dealerId || member.dealerId !== user.dealerId) return { error: "Usuario no encontrado." };
  // Los vehículos pertenecen al dealer: se reasignan a quien elimina al usuario.
  await db.$transaction([
    db.vehicle.updateMany({ where: { ownerId: memberId }, data: { ownerId: user.id } }),
    db.subscription.updateMany({ where: { userId: memberId }, data: { userId: user.id } }),
    db.user.delete({ where: { id: memberId } }),
  ]);
  revalidatePath("/panel/equipo");
  return { ok: "Usuario eliminado." };
}
