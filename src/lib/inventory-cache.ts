import "server-only";
import { updateTag } from "next/cache";

/**
 * Etiqueta de caché de todo lo derivado del inventario publicado (catálogo y facetas del buscador).
 * Se expira con `inventoryChanged()` desde las Server Actions que crean, editan, pausan o borran vehículos.
 * Lo que no pasa por una Server Action (p. ej. el vencimiento de planes) se refleja al cumplirse el TTL.
 */
export const INVENTORY_TAG = "inventory";
export const INVENTORY_TTL_SECONDS = 60;

/** Solo dentro de Server Actions (`updateTag` no se permite en otros contextos). */
export function inventoryChanged() {
  updateTag(INVENTORY_TAG);
}
