import type { Metadata } from "next";
import { db } from "@/lib/db";
import { searchMapPoints } from "@/lib/search";
import { parseSearchParams } from "@/lib/search-params";
import { BODY_TYPES, formatKm, formatPrice } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { MapView } from "@/components/map/map-view";
import type { MapPoint } from "@/components/map/types";
import { input } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Mapa de vehículos y dealers" };

export default async function MapPage({ searchParams }: PageProps<"/mapa">) {
  const sp = await searchParams;
  const f = parseSearchParams(sp);
  const show = sp.ver === "dealers" || sp.ver === "vehiculos" ? sp.ver : "todos";

  const [vehicles, dealers, brands] = await Promise.all([
    show === "dealers" ? [] : searchMapPoints(f, 800),
    show === "vehiculos" ? [] : db.dealer.findMany({ where: { status: "APPROVED" }, include: { _count: { select: { vehicles: { where: { status: "ACTIVE" } } } } } }),
    db.brand.findMany({ where: { models: { some: { vehicles: { some: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const points: MapPoint[] = [
    ...dealers.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, kind: "dealer" as const, title: d.name, subtitle: `${d._count.vehicles} vehículos`, href: `/dealers/${d.slug}`, image: d.coverUrl })),
    ...vehicles.map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      kind: "vehicle" as const,
      title: `${vehicleTitle(v)} ${v.year}`,
      subtitle: `${formatPrice(v.price, v.currency)}, ${formatKm(v.mileageKm)}`,
      href: vehicleUrl(v),
      image: v.photos[0]?.url,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">Mapa</h1>
          <p className="mt-1 text-muted">
            {vehicles.length} vehículos y {dealers.length} dealers en República Dominicana
          </p>
        </div>
        <form method="get" className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="ver">
            Mostrar
          </label>
          <select id="ver" name="ver" defaultValue={show} className={`${input} w-40`} data-autosubmit>
            <option value="todos">Todo</option>
            <option value="vehiculos">Solo vehículos</option>
            <option value="dealers">Solo dealers</option>
          </select>
          <label className="sr-only" htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={f.tipo?.toLowerCase() ?? ""} className={`${input} w-44`} data-autosubmit>
            <option value="">Todos los tipos</option>
            {BODY_TYPES.map((t) => (
              <option key={t.value} value={t.value.toLowerCase()}>
                {t.plural}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="marca">
            Marca
          </label>
          <select id="marca" name="marca" defaultValue={f.marca ?? ""} className={`${input} w-44`} data-autosubmit>
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <noscript>
            <button type="submit">Aplicar</button>
          </noscript>
        </form>
      </div>
      <div className="mt-4 flex gap-5 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#d0142c] ring-2 ring-white" /> Vehículos
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#0b2a5b] ring-2 ring-white" /> Dealers
        </span>
      </div>
      <MapView className="mt-4 h-[72vh] min-h-[28rem]" points={points} />
    </div>
  );
}
