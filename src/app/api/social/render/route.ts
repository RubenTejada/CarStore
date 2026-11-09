import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { takeToken } from "@/lib/rate-limit";
import { slugify } from "@/lib/labels";
import { designSchema } from "@/lib/social/design";
import { renderAdImage } from "@/lib/social/render";
import { loadAd, socialEnabled } from "@/lib/social/service";

// Imagen final del anuncio (la misma que se publica), para descargarla desde el editor.
// Sin `vehicleId` usa el vehículo más reciente del dealer como muestra del diseño por defecto.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.dealerId || user.role !== "DEALER") return Response.json({ error: "Inicia sesión con tu cuenta de dealer." }, { status: 401 });
  if (!(await socialEnabled(user.dealerId))) return Response.json({ error: "Tu plan no incluye el módulo de redes sociales." }, { status: 403 });
  if (!takeToken(`social-render:${user.id}`, 60, 3_600_000)) return Response.json({ error: "Generaste muchas imágenes seguidas. Intenta en un rato." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { vehicleId?: unknown; design?: unknown } | null;
  const design = designSchema.safeParse(body?.design);
  if (!design.success) return Response.json({ error: "Diseño inválido." }, { status: 400 });

  const vehicleId =
    typeof body?.vehicleId === "string"
      ? body.vehicleId
      : (await db.vehicle.findFirst({ where: { dealerId: user.dealerId, photos: { some: {} } }, orderBy: { updatedAt: "desc" }, select: { id: true } }))?.id;
  const ad = vehicleId ? await loadAd(vehicleId) : null;
  if (!ad || ad.vehicle.dealerId !== user.dealerId || !canEditVehicle(user, ad.vehicle)) return Response.json({ error: "Vehículo no encontrado." }, { status: 404 });

  try {
    const jpeg = await renderAdImage(design.data, ad.data);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${slugify(`${ad.data.title} ${ad.data.year}`)}-${design.data.format}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[redes] imagen", error);
    return Response.json({ error: "No se pudo generar la imagen." }, { status: 500 });
  }
}
