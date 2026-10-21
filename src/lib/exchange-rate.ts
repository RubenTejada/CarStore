import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { ensureUsdRate, rdDay } from "@/lib/usd-rate";
import { USD_TO_DOP } from "@/lib/labels";

/** Tasa USD→DOP vigente. `publishedOn` es `null` cuando se usa la tasa de respaldo. */
export type UsdRate = { rate: number; publishedOn: Date | null };

/** `day`: día (Santo Domingo) en que se consultó la tasa; `null` si es la de respaldo. */
type Cached = { day: string | null; value: UsdRate };

const RETRY_AFTER_MS = 60 * 60_000;

let cached: Promise<Cached> | null = null;
let refreshing: Promise<void> | null = null;
let retryAt = 0;

/**
 * Tasa de venta del dólar del Banco Central, cacheada por día en la base de datos.
 *
 * Nunca hace esperar al visitante por el BCRD: si la tasa guardada no es la de hoy se responde
 * con ella y se refresca después de enviar la respuesta (`after`). El refresco guarda la tasa
 * del día y recalcula `priceDop` de los vehículos en USD, así filtros, orden y comparador
 * usan la tasa vigente. Si el BCRD falla se reintenta en una hora. El trabajo diario
 * (`scripts/update-rates.ts`) suele guardarla antes; entonces el refresco solo la lee.
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
    cached = Promise.resolve(fromRow(await ensureUsdRate(day)));
  } catch (error) {
    retryAt = Date.now() + RETRY_AFTER_MS;
    console.error("[tasa BCRD] no se pudo actualizar la tasa del día:", error);
  }
}

function fromRow(row: { day: Date; usdDop: number; publishedOn: Date }): Cached {
  return { day: row.day.toISOString().slice(0, 10), value: { rate: row.usdDop, publishedOn: row.publishedOn } };
}
