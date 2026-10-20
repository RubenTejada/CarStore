import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { BCRD_USD_URL, latestUsdRate } from "@/lib/bcrd";
import { USD_TO_DOP } from "@/lib/labels";

/** Tasa USD→DOP vigente. `publishedOn` es `null` cuando se usa la tasa de respaldo. */
export type UsdRate = { rate: number; publishedOn: Date | null };

/** `day`: día (Santo Domingo) en que se consultó la tasa; `null` si es la de respaldo. */
type Cached = { day: string | null; value: UsdRate };

const RETRY_AFTER_MS = 60 * 60_000;

let cached: Promise<Cached> | null = null;
let refreshing: Promise<void> | null = null;
let retryAt = 0;

/** Día calendario en Santo Domingo (UTC-4, sin horario de verano), p. ej. "2026-10-20". */
export function rdDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(now);
}

/**
 * Tasa de venta del dólar del Banco Central, cacheada por día en la base de datos.
 *
 * Nunca hace esperar al visitante por el BCRD: si la tasa guardada no es la de hoy se responde
 * con ella y se refresca después de enviar la respuesta (`after`). El refresco guarda la tasa
 * del día y recalcula `priceDop` de los vehículos en USD, así filtros, orden y comparador
 * usan la tasa vigente. Si el BCRD falla se reintenta en una hora.
 * Solo dentro de una petición (Server Components, Server Actions, Route Handlers).
 */
export async function getUsdRate(): Promise<UsdRate> {
  cached ??= loadStored().catch((error) => {
    cached = null;
    throw error;
  });
  const { day, value } = await cached;
  const today = rdDay();
  if (day !== today && Date.now() >= retryAt) after(() => (refreshing ??= refresh(today).finally(() => (refreshing = null))));
  return value;
}

/** La última tasa guardada (de cualquier día) o la de respaldo. */
async function loadStored(): Promise<Cached> {
  const last = await db.exchangeRate.findFirst({ orderBy: { day: "desc" } });
  return last ? fromRow(last) : { day: null, value: { rate: USD_TO_DOP, publishedOn: null } };
}

async function refresh(day: string) {
  try {
    const key = new Date(day);
    // Otra instancia pudo guardarla (y recalcular precios) primero.
    let row = await db.exchangeRate.findUnique({ where: { day: key } });
    if (!row) {
      const fresh = await fetchBcrdRate(day);
      // En una transacción: guardar la tasa sin recalcular los precios la daría por aplicada.
      [row] = await db.$transaction([
        db.exchangeRate.upsert({
          where: { day: key },
          create: { day: key, usdDop: fresh.sell, publishedOn: new Date(fresh.date) },
          update: {},
        }),
        repriceUsdVehicles(fresh.sell),
      ]);
    }
    cached = Promise.resolve(fromRow(row));
  } catch (error) {
    retryAt = Date.now() + RETRY_AFTER_MS;
    console.error("[tasa BCRD] no se pudo actualizar la tasa del día:", error);
  }
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

function fromRow(row: { day: Date; usdDop: number; publishedOn: Date }): Cached {
  return { day: row.day.toISOString().slice(0, 10), value: { rate: row.usdDop, publishedOn: row.publishedOn } };
}
