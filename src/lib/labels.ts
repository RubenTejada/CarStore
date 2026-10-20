import type {
  BodyType,
  Condition,
  Currency,
  Drivetrain,
  FeatureCategory,
  Fuel,
  Transmission,
  VehicleStatus,
  SubscriptionStatus,
  DealerStatus,
  Role,
} from "@/generated/prisma/enums";

// Tasa fija usada para normalizar precios en USD a DOP (filtros y orden).
export const USD_TO_DOP = 60;

export function toDop(price: number, currency: Currency) {
  return currency === "USD" ? Math.round(price * USD_TO_DOP) : price;
}

export const BODY_TYPES: { value: BodyType; label: string; plural: string }[] = [
  { value: "JEEPETA", label: "Jeepeta / SUV", plural: "Jeepetas" },
  { value: "SEDAN", label: "Sedán", plural: "Sedanes" },
  { value: "PICKUP", label: "Camioneta", plural: "Camionetas" },
  { value: "HATCHBACK", label: "Hatchback", plural: "Hatchbacks" },
  { value: "COUPE", label: "Coupé", plural: "Coupés" },
  { value: "CONVERTIBLE", label: "Convertible", plural: "Convertibles" },
  { value: "MINIVAN", label: "Minivan", plural: "Minivans" },
  { value: "VAN", label: "Van / Guagua", plural: "Vans" },
];

export const BODY_TYPE_LABEL = Object.fromEntries(
  BODY_TYPES.map((b) => [b.value, b.label]),
) as Record<BodyType, string>;

export const CONDITION_LABEL: Record<Condition, string> = {
  NEW: "Nuevo",
  USED: "Usado",
};

export const TRANSMISSION_LABEL: Record<Transmission, string> = {
  AUTOMATIC: "Automática",
  MANUAL: "Manual",
  CVT: "CVT",
};

export const FUEL_LABEL: Record<Fuel, string> = {
  GASOLINE: "Gasolina",
  DIESEL: "Diésel",
  HYBRID: "Híbrido",
  ELECTRIC: "Eléctrico",
  GLP: "GLP (gas)",
};

export const DRIVETRAIN_LABEL: Record<Drivetrain, string> = {
  FWD: "Delantera (FWD)",
  RWD: "Trasera (RWD)",
  AWD: "Integral (AWD)",
  FOUR_WD: "4x4",
};

export const FEATURE_CATEGORY_LABEL: Record<FeatureCategory, string> = {
  SEGURIDAD: "Seguridad",
  CONFORT: "Confort",
  TECNOLOGIA: "Tecnología",
  EXTERIOR: "Exterior",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Publicado",
  PAUSED: "Pausado",
  SOLD: "Vendido",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  PENDING: "Pendiente de pago",
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  REJECTED: "Rechazado",
};

export const DEALER_STATUS_LABEL: Record<DealerStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  SUSPENDED: "Suspendido",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  DEALER: "Dealer",
  SELLER: "Particular",
};

export const COLORS = [
  "Blanco",
  "Negro",
  "Gris",
  "Plata",
  "Rojo",
  "Azul",
  "Verde",
  "Beige",
  "Marrón",
  "Dorado",
  "Naranja",
  "Amarillo",
];

const dop = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number, currency: Currency) {
  return currency === "USD" ? `US${usd.format(price)}` : dop.format(price);
}

export function formatKm(km: number) {
  return `${new Intl.NumberFormat("es-DO").format(km)} km`;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
