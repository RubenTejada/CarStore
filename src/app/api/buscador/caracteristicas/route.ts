import { parseSearchParams } from "@/lib/search-params";
import { getFinderFacets, normalizeFinderFilters } from "@/lib/finder-facets";

// Facetas del buscador principal (?marca=&modelo=&tipo=&condicion=&combustible=&transmision=&car=a,b).
// Los parámetros se validan con el mismo esquema que /vehiculos, así los conteos coinciden con los resultados.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const facets = await getFinderFacets(normalizeFinderFilters(parseSearchParams(params)));
  return Response.json(facets, {
    // El navegador puede reutilizar la respuesta unos segundos (volver atrás, repetir la misma selección).
    headers: { "Cache-Control": "private, max-age=15" },
  });
}
