import type { Metadata } from "next";
import { Building2, Car, Layers } from "lucide-react";
import { db } from "@/lib/db";
import { searchMapPoints } from "@/lib/search";
import { parseSearchParams } from "@/lib/search-params";
import { BODY_TYPES, formatKm, formatPrice } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { MapView } from "@/components/map/map-view";
import type { MapPoint } from "@/components/map/types";
import { input } from "@/components/ui/styles";
import { BodySilhouette } from "@/components/browse/body-silhouette";

const SHOW = [
  { value: "todos", label: "Todo", icon: Layers },
  { value: "vehiculos", label: "Vehículos", icon: Car },
  { value: "dealers", label: "Dealers", icon: Building2 },
] as const;

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
      <div>
        <h1 className="display text-3xl sm:text-4xl">Mapa</h1>
        <p className="mt-1 text-muted">
          {vehicles.length} vehículos y {dealers.length} dealers en República Dominicana
        </p>
      </div>
      <form method="get" className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="inline-grid grid-cols-3 rounded-lg border border-line bg-surface p-1">
            <legend className="sr-only">Mostrar</legend>
            {SHOW.map(({ value, label, icon: Icon }) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="ver" value={value} defaultChecked={show === value} className="peer sr-only" data-autosubmit />
                <span className="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-muted peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="sr-only" htmlFor="marca">
            Marca
          </label>
          <select id="marca" name="marca" defaultValue={f.marca ?? ""} className={`${input} sm:max-w-60`} data-autosubmit disabled={show === "dealers"}>
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset disabled={show === "dealers"} className="disabled:opacity-50">
          <legend className="sr-only">Tipo de vehículo</legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ value: "", label: "Todos los tipos" }, ...BODY_TYPES.map((t) => ({ value: t.value.toLowerCase(), label: t.plural, type: t.value }))].map((t) => (
              <label key={t.value} className="shrink-0 cursor-pointer">
                <input type="radio" name="tipo" value={t.value} defaultChecked={(f.tipo?.toLowerCase() ?? "") === t.value} className="peer sr-only" data-autosubmit />
                <span className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {"type" in t && t.type && <BodySilhouette type={t.type} className="h-4 w-10 [--glass:var(--surface)] [--rim:var(--surface)] [--tire:currentColor]" />}
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <noscript>
          <button type="submit">Aplicar</button>
        </noscript>
      </form>
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
