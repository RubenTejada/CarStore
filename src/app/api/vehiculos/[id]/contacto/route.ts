import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { LeadKind } from "@/generated/prisma/enums";

// Un visitante tocó «WhatsApp» o «Llamar» en la ficha (lo manda `navigator.sendBeacon`, el cuerpo es el tipo).
// Igual que las visitas, no cuenta los toques del propio vendedor.
export async function POST(request: Request, ctx: RouteContext<"/api/vehiculos/[id]/contacto">) {
  const { id } = await ctx.params;
  const body = (await request.text().catch(() => "")).trim();
  const kind = Object.values(LeadKind).find((k) => k === body);
  if (!kind) return new Response(null, { status: 400 });
  const [vehicle, user] = await Promise.all([
    db.vehicle.findUnique({ where: { id }, select: { id: true, status: true, ownerId: true, dealerId: true } }),
    getCurrentUser(),
  ]);
  if (!vehicle || vehicle.status !== "ACTIVE") return new Response(null, { status: 404 });
  if (!(user && canEditVehicle(user, vehicle))) await db.leadEvent.create({ data: { vehicleId: id, kind } });
  return new Response(null, { status: 204 });
}
