import { Droplets, Flame, Fuel as FuelIcon, Gauge, Infinity as InfinityIcon, Joystick, Leaf, Zap, type LucideIcon } from "lucide-react";
import type { Fuel, Transmission } from "@/generated/prisma/enums";

/** Iconos de combustible y transmisión, compartidos por el buscador del inicio y el panel de filtros. */
export const FUEL_ICON: Record<Fuel, LucideIcon> = {
  GASOLINE: FuelIcon,
  DIESEL: Droplets,
  HYBRID: Leaf,
  ELECTRIC: Zap,
  GLP: Flame,
};

export const TRANSMISSION_ICON: Record<Transmission, LucideIcon> = {
  AUTOMATIC: Gauge,
  MANUAL: Joystick,
  CVT: InfinityIcon,
};
