"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { inventoryChanged } from "@/lib/inventory-cache";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canEditVehicle, evaluatePublish, getActiveSubscription, getQuota } from "@/lib/listing-rules";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { slugify, toDop } from "@/lib/labels";
import { getUsdRate } from "@/lib/exchange-rate";
import { BodyType, Condition, Currency, Drivetrain, Fuel, Transmission, VehicleStatus } from "@/generated/prisma/enums";
import type { FormState } from "./auth";

const photoUrl = z
  .string()
  .refine((u) => /^\/uploads\/\d{4}-\d{2}\/[a-f0-9]{24}\.webp$/.test(u) || u.startsWith("https://images.unsplash.com/"), "Foto inválida");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const optionalInt = (min: number, max: number) =>
  z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(min).max(max).nullable());

const vehicleSchema = z.object({
  modelId: z.string().min(1, "Selecciona marca y modelo"),
  bodyType: z.enum(BodyType),
  year: z.coerce.number().int().min(1950, "Año inválido").max(new Date().getFullYear() + 1, "Año inválido"),
  // "" = sin versión u "Otra" (texto libre en `trim`); si no, el id de una versión del catálogo.
  trimId: z.string().transform((v) => v || null),
  trim: optionalText(60),
  condition: z.enum(Condition),
  price: z.coerce.number().int().min(1000, "Escribe el precio").max(500_000_000),
  currency: z.enum(Currency),
  mileageKm: z.coerce.number().int().min(0).max(2_000_000),
  transmission: z.enum(Transmission),
  fuel: z.enum(Fuel),
  drivetrain: z.enum(Drivetrain),
  engine: optionalText(60),
  extColor: optionalText(30),
  intColor: optionalText(30),
  doors: optionalInt(1, 6),
  seats: optionalInt(1, 20),
  description: optionalText(4000),
  province: z.string().refine((p) => PROVINCE_NAMES.includes(p), "Selecciona la provincia"),
  lat: z.coerce.number().min(17.3).max(20.1, "La ubicación debe estar en República Dominicana"),
  lng: z.coerce.number().min(-72.1).max(-68.2, "La ubicación debe estar en República Dominicana"),
  photos: z.array(photoUrl).max(30, "Máximo 30 fotos"),
  features: z.array(z.string()).max(80),
  featured: z.boolean(),
  intent: z.enum(["draft", "publish"]),
});

const sellerOnly = () => requireUser("DEALER", "SELLER", "ADMIN");

async function loadEditable(user: CurrentUser, id: string) {
  const vehicle = await db.vehicle.findUnique({ where: { id }, select: { id: true, ownerId: true, dealerId: true, status: true, featuredUntil: true } });
  if (!vehicle || !canEditVehicle(user, vehicle)) return null;
  return vehicle;
}

export async function saveVehicle(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await sellerOnly();
  const parsed = vehicleSchema.safeParse({
    trimId: "",
    trim: "",
    ...Object.fromEntries([...form.entries()].filter(([k]) => k !== "photos" && k !== "features")),
    photos: form.getAll("photos"),
    features: form.getAll("features"),
    featured: form.get("featured") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const existing = id ? await loadEditable(user, id) : null;
  if (id && !existing) return { error: "No tienes permiso para editar este vehículo." };
  if (d.intent === "publish" && d.photos.length === 0) return { error: "Agrega al menos una foto para publicar." };

  const model = await db.model.findUnique({ where: { id: d.modelId }, select: { id: true } });
  if (!model) return { error: "El modelo seleccionado no existe." };

  // Versión: la del catálogo, o el texto libre enlazado al catálogo si coincide con una versión existente.
  const catalogTrim = d.trimId
    ? await db.trim.findFirst({ where: { id: d.trimId, modelId: d.modelId }, select: { id: true, name: true } })
    : d.trim
      ? await db.trim.findUnique({ where: { modelId_slug: { modelId: d.modelId, slug: slugify(d.trim) } }, select: { id: true, name: true } })
      : null;
  if (d.trimId && !catalogTrim) return { error: "La versión seleccionada no corresponde al modelo." };

  const activate = d.intent === "publish";
  const wasActive = existing?.status === "ACTIVE";
  const wasFeatured = !!existing?.featuredUntil && existing.featuredUntil > new Date();
  let featuredUntil: Date | null = null;

  // El administrador modera sin consumir cupo; dealers y particulares se validan contra su plan.
  if (user.role !== "ADMIN") {
    const quota = await getQuota(user);
    const error = evaluatePublish(quota, { activate, featured: d.featured, wasActive, wasFeatured });
    if (error) return { error };
    if (d.featured) featuredUntil = (await getActiveSubscription(user))?.endsAt ?? null;
  } else if (d.featured) {
    featuredUntil = existing?.featuredUntil ?? new Date(Date.now() + 30 * 86_400_000);
  }

  const [features, usd] = await Promise.all([db.feature.findMany({ where: { slug: { in: d.features } }, select: { id: true } }), getUsdRate()]);
  const data = {
    modelId: d.modelId,
    bodyType: d.bodyType,
    year: d.year,
    trim: catalogTrim?.name ?? d.trim,
    trimId: catalogTrim?.id ?? null,
    condition: d.condition,
    price: d.price,
    currency: d.currency,
    priceDop: toDop(d.price, d.currency, usd.rate),
    mileageKm: d.condition === "NEW" ? Math.min(d.mileageKm, 500) : d.mileageKm,
    transmission: d.transmission,
    fuel: d.fuel,
    drivetrain: d.drivetrain,
    engine: d.engine,
    extColor: d.extColor,
    intColor: d.intColor,
    doors: d.doors,
    seats: d.seats,
    description: d.description,
    province: d.province,
    lat: d.lat,
    lng: d.lng,
    status: activate ? VehicleStatus.ACTIVE : VehicleStatus.DRAFT,
    featuredUntil,
  };

  await db.$transaction(async (tx) => {
    const vehicle = existing
      ? await tx.vehicle.update({ where: { id: existing.id }, data })
      : await tx.vehicle.create({ data: { ...data, ownerId: user.id, dealerId: user.dealerId } });
    await tx.vehiclePhoto.deleteMany({ where: { vehicleId: vehicle.id } });
    await tx.vehiclePhoto.createMany({ data: d.photos.map((url, position) => ({ vehicleId: vehicle.id, url, position })) });
    await tx.vehicleFeature.deleteMany({ where: { vehicleId: vehicle.id } });
    await tx.vehicleFeature.createMany({ data: features.map((f) => ({ vehicleId: vehicle.id, featureId: f.id })) });
  });

  inventoryChanged();
  revalidatePath("/", "layout");
  redirect(user.role === "ADMIN" ? "/admin/vehiculos" : `/panel/vehiculos?ok=${activate ? "publicado" : "guardado"}`);
}

/** Cambia el estado (publicar, pausar, vendido) de un vehículo propio. */
export async function setVehicleStatus(id: string, status: VehicleStatus): Promise<FormState> {
  const user = await sellerOnly();
  const vehicle = await loadEditable(user, id);
  if (!vehicle) return { error: "No tienes permiso para modificar este vehículo." };
  if (!Object.values(VehicleStatus).includes(status)) return { error: "Estado inválido." };

  if (status === "ACTIVE" && user.role !== "ADMIN") {
    const photos = await db.vehiclePhoto.count({ where: { vehicleId: id } });
    if (!photos) return { error: "Agrega al menos una foto para publicar." };
    const error = evaluatePublish(await getQuota(user), { activate: true, featured: false, wasActive: vehicle.status === "ACTIVE", wasFeatured: false });
    if (error) return { error };
  }
  await db.vehicle.update({
    where: { id },
    data: { status, ...(status !== "ACTIVE" && { featuredUntil: null }) },
  });
  inventoryChanged();
  revalidatePath("/", "layout");
  return { ok: "Estado actualizado." };
}

export async function toggleFeatured(id: string): Promise<FormState> {
  const user = await sellerOnly();
  const vehicle = await loadEditable(user, id);
  if (!vehicle) return { error: "No tienes permiso para modificar este vehículo." };
  const isFeatured = !!vehicle.featuredUntil && vehicle.featuredUntil > new Date();
  if (isFeatured) {
    await db.vehicle.update({ where: { id }, data: { featuredUntil: null } });
  } else {
    let until = new Date(Date.now() + 30 * 86_400_000);
    if (user.role !== "ADMIN") {
      const error = evaluatePublish(await getQuota(user), { activate: vehicle.status === "ACTIVE", featured: true, wasActive: true, wasFeatured: false });
      if (error) return { error };
      until = (await getActiveSubscription(user))!.endsAt!;
    }
    await db.vehicle.update({ where: { id }, data: { featuredUntil: until } });
  }
  revalidatePath("/", "layout");
  return { ok: isFeatured ? "Ya no está destacado." : "Vehículo destacado en la portada." };
}

export async function deleteVehicle(id: string): Promise<FormState> {
  const user = await sellerOnly();
  const vehicle = await loadEditable(user, id);
  if (!vehicle) return { error: "No tienes permiso para eliminar este vehículo." };
  await db.vehicle.delete({ where: { id } });
  inventoryChanged();
  revalidatePath("/", "layout");
  return { ok: "Vehículo eliminado." };
}
