// Vehículos guardados y vistos recientemente: listas de ids que viven en el navegador.
import { ID_RE } from "@/lib/compare";

export const MAX_SAVED = 60;
export const MAX_RECENT = 12;

/** Ids válidos y sin repetir, en el orden recibido, como máximo `max`. */
export function cleanIds(values: unknown[], max: number): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && ID_RE.test(v)))].slice(0, max);
}

/** Contenido de localStorage → ids; cualquier cosa rara se descarta. */
export function parseIdList(raw: string | null, max: number): string[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(data) ? cleanIds(data, max) : [];
  } catch {
    return [];
  }
}

/** El vehículo recién visto pasa al frente. */
export function pushRecent(ids: string[], id: string, max = MAX_RECENT): string[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, max);
}
