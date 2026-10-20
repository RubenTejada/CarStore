import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { db } from "@/lib/db";
import { getFacets, searchMapPoints, searchVehicles } from "@/lib/search";
import { parseSearchParams, toQueryString, type SearchFilters } from "@/lib/search-params";
import { BODY_TYPE_LABEL, CONDITION_LABEL, DRIVETRAIN_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice } from "@/lib/labels";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { FilterPanel } from "@/components/browse/filter-panel";
import { SortSelect } from "@/components/browse/sort-select";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { MapView } from "@/components/map/map-view";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Vehículos en venta" };

export default async function VehiclesPage({ searchParams }: PageProps<"/vehiculos">) {
  const raw = await searchParams;
  const f = parseSearchParams(raw);
  const mapMode = f.vista === "mapa";

  const [result, facets, brands, features, points, modelTrims] = await Promise.all([
    searchVehicles(f),
    getFacets(f),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, models: { select: { slug: true, name: true }, orderBy: { name: "asc" } } } }),
    db.feature.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, category: true } }),
    mapMode ? searchMapPoints(f) : Promise.resolve([]),
    f.marca && f.modelo
      ? db.trim.findMany({ where: { model: { slug: f.modelo, brand: { slug: f.marca } } }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } })
      : Promise.resolve([]),
  ]);

  const brandName = brands.find((b) => b.slug === f.marca)?.name;
  const modelName = brands.find((b) => b.slug === f.marca)?.models.find((m) => m.slug === f.modelo)?.name;
  const trimName = modelTrims.find((t) => t.slug === f.version)?.name;
  const trims = modelTrims
    .map((t) => ({ slug: t.slug, name: t.name, count: facets.trims[t.id] ?? 0 }))
    .filter((t) => t.count > 0 || t.slug === f.version);
  const heading = [f.condicion && CONDITION_LABEL[f.condicion] + "s", f.tipo ? BODY_TYPE_LABEL[f.tipo] : null, brandName, modelName, trimName].filter(Boolean).join(" ") || "Todos los vehículos";

  const chips = activeChips(f, { brandName, modelName, trimName, features });
  const values = Object.fromEntries(
    new URLSearchParams(toQueryString(f).slice(1)).entries(),
  ) as Record<string, string>;
  const qs = toQueryString(f);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{heading}</h1>
          <p className="mt-1 text-muted" aria-live="polite">
            {result.total === 1 ? "1 vehículo encontrado" : `${result.total.toLocaleString("es-DO")} vehículos encontrados`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SortSelect value={f.orden ?? "recientes"} />
          <nav className="flex rounded-lg border border-line bg-surface p-1" aria-label="Vista">
            <Link
              href={toQueryString(f, { vista: undefined, pagina: undefined }) || "?"}
              aria-current={!mapMode ? "page" : undefined}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold", !mapMode ? "bg-brand text-brand-ink" : "text-muted hover:text-ink")}
            >
              <LayoutGrid className="size-4" aria-hidden />
              Lista
            </Link>
            <Link
              href={toQueryString(f, { vista: "mapa", pagina: undefined })}
              aria-current={mapMode ? "page" : undefined}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold", mapMode ? "bg-brand text-brand-ink" : "text-muted hover:text-ink")}
            >
              <MapIcon className="size-4" aria-hidden />
              Mapa
            </Link>
          </nav>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Filtros activos">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={toQueryString(f, { ...c.remove, pagina: undefined }) || "?"}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pr-2.5 pl-3.5 text-sm font-medium hover:border-ink"
                aria-label={`Quitar filtro ${c.label}`}
              >
                {c.label}
                <X className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link href={f.vista ? "?vista=mapa" : "/vehiculos"} className="flex py-1.5 text-sm font-semibold text-accent hover:underline">
              Limpiar todo
            </Link>
          </li>
        </ul>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[18rem_1fr]">
        <aside>
          <input type="checkbox" id="filters-toggle" className="peer sr-only" />
          <label
            htmlFor="filters-toggle"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface py-3 font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros {chips.length > 0 && `(${chips.length})`}
          </label>
          <div className="mt-4 hidden peer-checked:block lg:mt-0 lg:block">
            <Filters f={f} values={values} brands={brands} trims={trims} facets={facets} features={features} qs={qs} />
          </div>
        </aside>

        <section aria-label="Resultados">
          {mapMode ? (
            <MapView
              className="h-[70vh] min-h-96"
              points={points.map((v) => ({
                id: v.id,
                lat: v.lat,
                lng: v.lng,
                kind: "vehicle",
                title: `${vehicleTitle(v)} ${v.year}`,
                subtitle: `${formatPrice(v.price, v.currency)}, ${formatKm(v.mileageKm)}`,
                href: vehicleUrl(v),
                image: v.photos[0]?.url,
              }))}
            />
          ) : result.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-12 text-center">
              <p className="display text-2xl">No hay vehículos con estos filtros</p>
              <p className="mt-2 text-muted">Quita algún filtro o amplía el rango de precio o año.</p>
              <Link href="/vehiculos" className="mt-5 inline-block font-semibold text-brand hover:underline">
                Ver todos los vehículos
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((v, i) => (
                  <li key={v.id}>
                    <VehicleCard v={v} priority={i < 3} className="h-full" />
                  </li>
                ))}
              </ul>
              {result.pages > 1 && <Pagination f={f} page={result.page} pages={result.pages} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Filters({
  f,
  values,
  brands,
  trims,
  facets,
  features,
  qs,
}: {
  f: SearchFilters;
  values: Record<string, string>;
  brands: { slug: string; name: string; models: { slug: string; name: string }[] }[];
  trims: { slug: string; name: string; count: number }[];
  facets: Awaited<ReturnType<typeof getFacets>>;
  features: { slug: string; name: string; category: import("@/generated/prisma/enums").FeatureCategory }[];
  qs: string;
}) {
  return (
    <FilterPanel
      key={qs}
      values={values}
      selectedFeatures={f.car ?? []}
      brands={brands
        .map((b) => ({ ...b, count: facets.brands[b.slug] ?? 0 }))
        .filter((b) => b.count > 0 || b.slug === f.marca)}
      trims={trims}
      typeCounts={facets.types}
      features={features}
      provinces={PROVINCE_NAMES}
    />
  );
}

function Pagination({ f, page, pages }: { f: SearchFilters; page: number; pages: number }) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginación">
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={toQueryString(f, { pagina: n === 1 ? undefined : n }) || "?"}
            aria-current={n === page ? "page" : undefined}
            className={cn("grid size-10 place-items-center rounded-lg text-sm font-semibold", n === page ? "bg-brand text-brand-ink" : "border border-line bg-surface hover:border-ink")}
          >
            {n}
          </Link>
        </span>
      ))}
    </nav>
  );
}

type Remove = Partial<Record<keyof SearchFilters, unknown>>;

function activeChips(
  f: SearchFilters,
  ctx: { brandName?: string; modelName?: string; trimName?: string; features: { slug: string; name: string }[] },
): { label: string; remove: Remove }[] {
  const chips: { label: string; remove: Remove }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, remove: { q: undefined } });
  if (f.condicion) chips.push({ label: CONDITION_LABEL[f.condicion], remove: { condicion: undefined } });
  if (f.tipo) chips.push({ label: BODY_TYPE_LABEL[f.tipo], remove: { tipo: undefined } });
  if (f.marca) chips.push({ label: ctx.brandName ?? f.marca, remove: { marca: undefined, modelo: undefined, version: undefined } });
  if (f.modelo) chips.push({ label: ctx.modelName ?? f.modelo, remove: { modelo: undefined, version: undefined } });
  if (f.modelo && f.version) chips.push({ label: ctx.trimName ?? f.version, remove: { version: undefined } });
  if (f.precioMin) chips.push({ label: `Desde ${formatPrice(f.precioMin, "DOP")}`, remove: { precioMin: undefined } });
  if (f.precioMax) chips.push({ label: `Hasta ${formatPrice(f.precioMax, "DOP")}`, remove: { precioMax: undefined } });
  if (f.anioMin) chips.push({ label: `Año ${f.anioMin}+`, remove: { anioMin: undefined } });
  if (f.anioMax) chips.push({ label: `Año hasta ${f.anioMax}`, remove: { anioMax: undefined } });
  if (f.kmMax !== undefined) chips.push({ label: `Hasta ${formatKm(f.kmMax)}`, remove: { kmMax: undefined } });
  if (f.transmision) chips.push({ label: TRANSMISSION_LABEL[f.transmision], remove: { transmision: undefined } });
  if (f.combustible) chips.push({ label: FUEL_LABEL[f.combustible], remove: { combustible: undefined } });
  if (f.traccion) chips.push({ label: DRIVETRAIN_LABEL[f.traccion], remove: { traccion: undefined } });
  if (f.color) chips.push({ label: f.color, remove: { color: undefined } });
  if (f.provincia) chips.push({ label: f.provincia, remove: { provincia: undefined } });
  if (f.dealer) chips.push({ label: `Dealer: ${f.dealer}`, remove: { dealer: undefined } });
  for (const slug of f.car ?? [])
    chips.push({
      label: ctx.features.find((x) => x.slug === slug)?.name ?? slug,
      remove: { car: f.car!.filter((s) => s !== slug) },
    });
  return chips;
}
