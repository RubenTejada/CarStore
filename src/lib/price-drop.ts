// Rebajas de precio: qué se guarda al cambiar el precio de un anuncio y cuándo se muestra «Bajó de precio».
import type { Currency } from "@/generated/prisma/enums";

/** Días que una rebaja se anuncia en tarjetas y fichas. */
export const DROP_BADGE_DAYS = 30;

type Price = { price: number; currency: Currency };
export type DropState = { priceBefore: number | null; priceDropAt: Date | null };
const NO_DROP: DropState = { priceBefore: null, priceDropAt: null };

/**
 * Estado de rebaja tras cambiar el precio de `prev` a `next`.
 * Varias rebajas seguidas dentro del plazo se suman desde el precio original; una subida
 * o un cambio de moneda (precios no comparables) la cancelan.
 */
export function nextPriceDrop(prev: Price & DropState, next: Price, now = new Date()): DropState {
  if (prev.currency !== next.currency || next.price > prev.price) return NO_DROP;
  if (next.price === prev.price) return { priceBefore: prev.priceBefore, priceDropAt: prev.priceDropAt };
  const ongoing = priceDrop(prev, now) !== null;
  return { priceBefore: ongoing ? prev.priceBefore : prev.price, priceDropAt: now };
}

/** Cuánto bajó (en la moneda del anuncio) si la rebaja sigue vigente; si no, `null`. */
export function priceDrop(
  v: { price: number; priceBefore: number | null; priceDropAt: Date | string | null },
  now = new Date(),
): number | null {
  if (!v.priceBefore || !v.priceDropAt || v.priceBefore <= v.price) return null;
  const age = now.getTime() - new Date(v.priceDropAt).getTime();
  return age < DROP_BADGE_DAYS * 86_400_000 ? v.priceBefore - v.price : null;
}
