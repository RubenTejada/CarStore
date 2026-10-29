// Analítica de contactos (toques en WhatsApp o Llamar) para el panel del vendedor.
import { rdDay } from "@/lib/usd-rate";

export const LEAD_DAYS = 30;

/** Inicio del periodo que muestra el panel. */
export const leadWindowStart = (now = new Date()) => new Date(now.getTime() - LEAD_DAYS * 86_400_000);

/** Contactos por día (Santo Domingo) de los últimos `days` días, del más antiguo a hoy, con los días sin contactos en 0. */
export function dailyCounts(dates: Date[], days = LEAD_DAYS, now = new Date()): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(rdDay(d), (counts.get(rdDay(d)) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const day = rdDay(new Date(now.getTime() - (days - 1 - i) * 86_400_000));
    return { day, count: counts.get(day) ?? 0 };
  });
}

/** Contactos por cada 100 visitas, con un decimal; `null` sin visitas. */
export function contactRate(contacts: number, views: number): number | null {
  return views > 0 ? Math.round((contacts / views) * 1000) / 10 : null;
}
