// Descripción de un anuncio redactada por Claude a partir de los datos del formulario.
import type { Condition, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";
import { CONDITION_LABEL, DRIVETRAIN_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm } from "@/lib/labels";

export type DescriptionInput = {
  title: string;
  year: number;
  condition: Condition;
  mileageKm: number | null;
  transmission: Transmission | null;
  fuel: Fuel | null;
  drivetrain: Drivetrain | null;
  engine: string;
  extColor: string;
  intColor: string;
  doors: number | null;
  seats: number | null;
  features: string[];
};

/** Datos del vehículo en líneas «Campo: valor», solo los que el vendedor llenó. */
export function vehicleFacts(v: DescriptionInput): string {
  const lines: [string, string | null | false][] = [
    ["Vehículo", `${v.title} ${v.year}`],
    ["Condición", CONDITION_LABEL[v.condition]],
    ["Kilometraje", v.condition === "USED" && v.mileageKm !== null && formatKm(v.mileageKm)],
    ["Transmisión", v.transmission && TRANSMISSION_LABEL[v.transmission]],
    ["Combustible", v.fuel && FUEL_LABEL[v.fuel]],
    ["Tracción", v.drivetrain && DRIVETRAIN_LABEL[v.drivetrain]],
    ["Motor", v.engine],
    ["Color exterior", v.extColor],
    ["Color interior", v.intColor],
    ["Puertas", v.doors !== null && String(v.doors)],
    ["Pasajeros", v.seats !== null && String(v.seats)],
    ["Características", v.features.join(", ")],
  ];
  return lines.flatMap(([k, val]) => (val ? [`${k}: ${val}`] : [])).join("\n");
}

export const DESCRIPTION_SYSTEM = `Redactas la descripción de anuncios de vehículos en venta para un portal de República Dominicana.
- Escribe en español dominicano neutro, claro y amable, de 60 a 120 palabras, en uno o dos párrafos de texto plano (sin títulos, viñetas, emojis ni markdown).
- Usa solo los datos que te dan; no inventes estado, mantenimientos, dueños, garantía, financiamiento ni accidentes.
- No incluyas precio, teléfonos, correos, enlaces ni nombres de personas o negocios.
- Si te dan una descripción del vendedor, conserva sus datos y mejora la redacción.
- Responde solo con la descripción.`;
