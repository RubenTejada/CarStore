// Búsquedas guardadas: qué parte de la búsqueda de /vehiculos se guarda para las alertas.
import { toQueryString, type SearchFilters } from "@/lib/search-params";

export const MAX_SAVED_SEARCHES = 20;

/** Filtros de la búsqueda como query string, sin página, orden, vista, moneda ni el texto interpretado. Vacío sin filtros. */
export function savedSearchQuery(f: SearchFilters) {
  return toQueryString({ ...f, pagina: undefined, orden: undefined, vista: undefined, moneda: undefined, ia: undefined }).slice(1);
}
