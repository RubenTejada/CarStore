import { db } from "@/lib/db";
import { MAX_SAVED, cleanIds } from "@/lib/saved";
import { vehicleCardSelect } from "@/lib/search";

// Tarjetas de los vehículos guardados o vistos en este navegador (?ids=a,b,c), solo los publicados y en ese orden.
export async function GET(request: Request) {
  const ids = cleanIds((new URL(request.url).searchParams.get("ids") ?? "").split(","), MAX_SAVED);
  const rows = ids.length ? await db.vehicle.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: vehicleCardSelect }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return Response.json(
    { items: ids.flatMap((id) => byId.get(id) ?? []) },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
