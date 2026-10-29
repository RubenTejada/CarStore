import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { vehicleUrl } from "@/lib/urls";

// Consulta el inventario actual: publicar, pausar, vender o borrar se refleja en la siguiente petición.
export const dynamic = "force-dynamic";

// El serializador de sitemap de esta versión de Next inserta las URLs literalmente.
// Las fotos externas con ?w=1600&fit=crop necesitan entidades XML para que el sitemap sea válido.
const xmlUrl = (path: string) => siteUrl(path).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vehicles, dealers] = await Promise.all([
    db.vehicle.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, year: true,
        model: { select: { name: true, brand: { select: { name: true } } } },
        photos: { select: { url: true }, orderBy: { position: "asc" }, take: 10 },
      },
      orderBy: { id: "asc" },
    }),
    db.dealer.findMany({ where: { status: "APPROVED" }, select: { slug: true }, orderBy: { slug: "asc" } }),
  ]);
  return [
    ...["/", "/vehiculos", "/dealers", "/financiamiento", "/planes"].map((path) => ({ url: xmlUrl(path) })),
    ...dealers.map((dealer) => ({ url: xmlUrl(`/dealers/${dealer.slug}`) })),
    // updatedAt también cambia por visitas y tasas: no es una fecha fiable de modificación del contenido.
    ...vehicles.map((vehicle) => ({ url: xmlUrl(vehicleUrl(vehicle)), images: vehicle.photos.map((photo) => xmlUrl(photo.url)) })),
  ];
}
