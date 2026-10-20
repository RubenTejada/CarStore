import "server-only";
import { db } from "@/lib/db";
import { getQuota } from "@/lib/listing-rules";
import type { CurrentUser } from "@/lib/auth";
import type { VehicleFormValues } from "@/components/forms/vehicle-form";

/** Catálogos y valores por defecto del formulario de vehículo. */
export async function getVehicleFormData(user: CurrentUser) {
  const [brands, features, dealer] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, models: { orderBy: { name: "asc" }, select: { id: true, name: true, bodyType: true, trims: { orderBy: { name: "asc" }, select: { id: true, name: true } } } } } }),
    db.feature.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, category: true, icon: true } }),
    user.dealerId ? db.dealer.findUnique({ where: { id: user.dealerId }, select: { lat: true, lng: true, province: true } }) : null,
  ]);
  const quota = user.role === "ADMIN" ? null : await getQuota(user);
  const featuredHint = !quota
    ? "Moderación de administrador."
    : quota.featuredSlots
      ? `Usas ${quota.usedFeatured} de ${quota.featuredSlots} destacados de tu plan.`
      : "Tu plan actual no incluye destacados.";

  const defaults: VehicleFormValues = {
    modelId: "",
    brandId: "",
    bodyType: "SEDAN",
    year: new Date().getFullYear(),
    trimId: "",
    trim: "",
    condition: "USED",
    price: "",
    currency: "DOP",
    mileageKm: "",
    transmission: "AUTOMATIC",
    fuel: "GASOLINE",
    drivetrain: "FWD",
    engine: "",
    extColor: "",
    intColor: "",
    doors: 4,
    seats: 5,
    description: "",
    province: dealer?.province ?? "Distrito Nacional",
    lat: dealer?.lat ?? 18.4861,
    lng: dealer?.lng ?? -69.9312,
    photos: [],
    features: [],
    featured: false,
  };
  return { brands, features, defaults, featuredHint };
}
