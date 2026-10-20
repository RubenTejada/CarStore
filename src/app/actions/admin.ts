"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { inventoryChanged } from "@/lib/inventory-cache";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/labels";
import { FEATURE_ICON_KEYS } from "@/lib/feature-icons";
import { BodyType, DealerStatus, FeatureCategory } from "@/generated/prisma/enums";
import type { FormState } from "./auth";

const admin = () => requireUser("ADMIN");
const done = (ok: string): FormState => {
  // Las acciones de administración moderan vehículos, dealers y características: todo afecta el inventario.
  inventoryChanged();
  revalidatePath("/", "layout");
  return { ok };
};

// ---------- Suscripciones ----------

export async function approveSubscription(id: string): Promise<FormState> {
  const user = await admin();
  const sub = await db.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub || sub.status !== "PENDING") return { error: "La solicitud ya no está pendiente." };
  // Si hay un plan activo, el nuevo periodo empieza cuando termine el actual.
  const scope = sub.dealerId ? { dealerId: sub.dealerId } : { userId: sub.userId, dealerId: null };
  const current = await db.subscription.findFirst({ where: { ...scope, status: "ACTIVE", endsAt: { gt: new Date() } }, orderBy: { endsAt: "desc" } });
  const startsAt = current?.endsAt ?? new Date();
  const endsAt = new Date(startsAt.getTime() + sub.plan.durationDays * 86_400_000);
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", startsAt, endsAt, approvedById: user.id } });
  return done("Plan activado.");
}

export async function rejectSubscription(id: string): Promise<FormState> {
  const user = await admin();
  const { count } = await db.subscription.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", approvedById: user.id } });
  return count ? done("Solicitud rechazada.") : { error: "La solicitud ya no está pendiente." };
}

// ---------- Dealers ----------

export async function setDealerStatus(id: string, status: DealerStatus): Promise<FormState> {
  await admin();
  if (!Object.values(DealerStatus).includes(status)) return { error: "Estado inválido." };
  await db.$transaction([
    db.dealer.update({ where: { id }, data: { status } }),
    ...(status === "SUSPENDED" ? [db.vehicle.updateMany({ where: { dealerId: id, status: "ACTIVE" }, data: { status: "PAUSED", featuredUntil: null } })] : []),
  ]);
  return done(status === "APPROVED" ? "Dealer aprobado." : status === "SUSPENDED" ? "Dealer suspendido y sus vehículos pausados." : "Dealer actualizado.");
}

export async function toggleDealerVerified(id: string): Promise<FormState> {
  await admin();
  const d = await db.dealer.findUnique({ where: { id }, select: { verified: true } });
  if (!d) return { error: "Dealer no encontrado." };
  await db.dealer.update({ where: { id }, data: { verified: !d.verified } });
  return done(d.verified ? "Verificación retirada." : "Dealer verificado.");
}

// ---------- Usuarios ----------

export async function toggleUserActive(id: string): Promise<FormState> {
  const user = await admin();
  if (id === user.id) return { error: "No puedes desactivar tu propia cuenta." };
  const u = await db.user.findUnique({ where: { id }, select: { active: true } });
  if (!u) return { error: "Usuario no encontrado." };
  await db.$transaction([db.user.update({ where: { id }, data: { active: !u.active } }), ...(u.active ? [db.session.deleteMany({ where: { userId: id } })] : [])]);
  return done(u.active ? "Usuario desactivado." : "Usuario activado.");
}

// ---------- Catálogo ----------

const brandSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la marca").max(40),
  iconSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]*$/, "El ícono debe ser un slug (ej. toyota)")
    .transform((v) => v || null),
  color: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$|^$/, "Color en formato hexadecimal (ej. EB0A1E)")
    .transform((v) => v.replace("#", "").toUpperCase() || null),
});

export async function createBrand(_: FormState, form: FormData): Promise<FormState> {
  await admin();
  const parsed = brandSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = slugify(parsed.data.name);
  if (await db.brand.findUnique({ where: { slug } })) return { error: "Esa marca ya existe." };
  await db.brand.create({ data: { ...parsed.data, slug } });
  return done(`Marca ${parsed.data.name} creada.`);
}

const modelSchema = z.object({
  brandId: z.string().min(1, "Selecciona la marca"),
  name: z.string().trim().min(1, "Escribe el modelo").max(40),
  bodyType: z.enum(BodyType),
});

export async function createModel(_: FormState, form: FormData): Promise<FormState> {
  await admin();
  const parsed = modelSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = slugify(parsed.data.name);
  if (await db.model.findUnique({ where: { brandId_slug: { brandId: parsed.data.brandId, slug } } })) return { error: "Ese modelo ya existe en la marca." };
  await db.model.create({ data: { ...parsed.data, slug } });
  return done(`Modelo ${parsed.data.name} creado.`);
}

export async function deleteModel(id: string): Promise<FormState> {
  await admin();
  if (await db.vehicle.count({ where: { modelId: id } })) return { error: "No se puede eliminar: hay vehículos con este modelo." };
  await db.model.delete({ where: { id } });
  return done("Modelo eliminado.");
}

const trimSchema = z.object({
  modelId: z.string().min(1, "Selecciona el modelo"),
  name: z.string().trim().min(1, "Escribe la versión").max(60),
});

export async function createTrim(_: FormState, form: FormData): Promise<FormState> {
  await admin();
  return addTrim(Object.fromEntries(form));
}

/** Pasa al catálogo una versión que los vendedores escribieron a mano. */
export async function promoteTrim(modelId: string, name: string): Promise<FormState> {
  await admin();
  return addTrim({ modelId, name });
}

async function addTrim(input: unknown): Promise<FormState> {
  const parsed = trimSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { modelId, name } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { error: "Escribe la versión" };
  if (!(await db.model.findUnique({ where: { id: modelId }, select: { id: true } }))) return { error: "El modelo no existe." };
  if (await db.trim.findUnique({ where: { modelId_slug: { modelId, slug } } })) return { error: "Esa versión ya existe en el modelo." };

  const linked = await db.$transaction(async (tx) => {
    const trim = await tx.trim.create({ data: { modelId, name, slug } });
    // Enlaza las publicaciones que ya tenían esta versión escrita a mano, con cualquier grafía.
    const loose = await tx.vehicle.findMany({ where: { modelId, trimId: null, trim: { not: null } }, select: { id: true, trim: true } });
    const ids = loose.filter((v) => slugify(v.trim!) === slug).map((v) => v.id);
    if (ids.length) await tx.vehicle.updateMany({ where: { id: { in: ids } }, data: { trimId: trim.id, trim: trim.name } });
    return ids.length;
  });
  return done(linked ? `Versión ${name} creada; ${linked === 1 ? "1 vehículo enlazado" : `${linked} vehículos enlazados`}.` : `Versión ${name} creada.`);
}

/** Los vehículos conservan el texto de la versión; solo dejan de estar enlazados al catálogo. */
export async function deleteTrim(id: string): Promise<FormState> {
  await admin();
  await db.trim.delete({ where: { id } });
  return done("Versión eliminada.");
}

const featureSchema = z.object({
  name: z.string().trim().min(2, "Escribe la característica").max(60),
  category: z.enum(FeatureCategory),
  icon: z.string().refine((i) => FEATURE_ICON_KEYS.includes(i), "Ícono inválido"),
});

export async function createFeature(_: FormState, form: FormData): Promise<FormState> {
  await admin();
  const parsed = featureSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = slugify(parsed.data.name);
  if (await db.feature.findUnique({ where: { slug } })) return { error: "Esa característica ya existe." };
  await db.feature.create({ data: { ...parsed.data, slug } });
  return done("Característica creada.");
}

export async function deleteFeature(id: string): Promise<FormState> {
  await admin();
  await db.feature.delete({ where: { id } });
  return done("Característica eliminada.");
}

// ---------- Planes ----------

const planSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del plan").max(40),
  description: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  priceDop: z.coerce.number().int().min(0, "Precio inválido"),
  maxActiveListings: z.coerce.number().int().min(1, "Mínimo 1 vehículo"),
  featuredSlots: z.coerce.number().int().min(0),
  durationDays: z.coerce.number().int().min(1).max(366),
  forDealers: z.boolean(),
  active: z.boolean(),
});

export async function savePlan(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  await admin();
  const parsed = planSchema.safeParse({ ...Object.fromEntries(form), forDealers: form.get("forDealers") === "on", active: form.get("active") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id) await db.plan.update({ where: { id }, data: parsed.data });
  else await db.plan.create({ data: parsed.data });
  return done(id ? "Plan actualizado." : "Plan creado.");
}
