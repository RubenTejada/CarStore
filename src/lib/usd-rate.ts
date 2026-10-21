import { db } from "@/lib/db";
import { BCRD_USD_URL, latestUsdRate } from "@/lib/bcrd";

/**
 * Guardado de la tasa diaria del Banco Central. Sin dependencias de Next para que la usen tanto
 * el refresco perezoso de `getUsdRate` como el trabajo diario (`scripts/update-rates.ts`).
 */

/** Día calendario en Santo Domingo (UTC-4, sin horario de verano), p. ej. "2026-10-20". */
export function rdDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(now);
}

/**
 * Tasa del día `day`: la guardada o, si aún no existe, la del BCRD, guardada junto con el
 * recálculo de `priceDop` de los vehículos en USD.
 */
export async function ensureUsdRate(day: string) {
  const key = new Date(day);
  // Otra instancia pudo guardarla (y recalcular precios) primero.
  const row = await db.exchangeRate.findUnique({ where: { day: key } });
  if (row) return row;
  const fresh = await fetchBcrdRate(day);
  // En una transacción: guardar la tasa sin recalcular los precios la daría por aplicada.
  const [saved] = await db.$transaction([
    db.exchangeRate.upsert({
      where: { day: key },
      create: { day: key, usdDop: fresh.sell, publishedOn: new Date(fresh.date) },
      update: {},
    }),
    repriceUsdVehicles(fresh.sell),
  ]);
  return saved;
}

async function fetchBcrdRate(day: string) {
  // `v` evita que el CDN devuelva la copia de ayer.
  const res = await fetch(`${BCRD_USD_URL}?v=${day.replaceAll("-", "")}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`El BCRD respondió ${res.status}.`);
  const rate = latestUsdRate(new Uint8Array(await res.arrayBuffer()));
  if (!rate || rate.sell < 10 || rate.sell > 1_000) throw new Error(`El libro del BCRD no trae una tasa válida: ${JSON.stringify(rate)}`);
  return rate;
}

/** Mantiene `priceDop` (filtros, orden, histogramas) al día con la tasa vigente. */
function repriceUsdVehicles(rate: number) {
  return db.$executeRaw`UPDATE "Vehicle" SET "priceDop" = ROUND("price" * ${rate}::float8)::int WHERE "currency" = 'USD'`;
}
