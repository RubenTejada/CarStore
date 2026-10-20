import { getSearchIndex } from "@/lib/catalog";
import { INVENTORY_TTL_SECONDS } from "@/lib/inventory-cache";

// Índice del autocompletado del buscador; el navegador lo pide una vez por visita al enfocar la búsqueda.
export async function GET() {
  return Response.json(await getSearchIndex(), {
    headers: { "Cache-Control": `public, max-age=${INVENTORY_TTL_SECONDS}` },
  });
}
