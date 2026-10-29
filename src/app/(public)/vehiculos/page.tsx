import type { Metadata } from "next";
import { browseMetadata } from "@/lib/seo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LayoutGrid, Map as MapIcon, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { db } from "@/lib/db";
import { getBrowseCatalog, getSearchIndex, type BrowseBrand } from "@/lib/catalog";
import { prepareIndex, resolveFreeText } from "@/lib/search-suggest";
import { getFacets, searchMapPoints, searchVehicles } from "@/lib/search";
import { getUsdRate } from "@/lib/exchange-rate";
import { interpretSearch } from "@/lib/search-ai";
import { getCurrentUser } from "@/lib/auth";
import { savedSearchQuery } from "@/lib/saved-search";
import { SaveSearchButton } from "@/components/saved/save-search-button";
import { parseSearchParams, toQueryString, type SearchFilters } from "@/lib/search-params";
import { BODY_TYPE_LABEL, CONDITION_LABEL, DRIVETRAIN_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice, toUsd } from "@/lib/labels";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { FilterPanel } from "@/components/browse/filter-panel";
import { SearchBox } from "@/components/browse/search-box";
import { SortSelect } from "@/components/browse/sort-select";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { RecentlyViewed } from "@/components/saved/recently-viewed";
import { MapView } from "@/components/map/map-view";
import { PageHeader } from "@/components/layout/page-header";
import { LOOK } from "@/components/layout/look";
import { cn } from "@/lib/cn";

export async function generateMetadata({ searchParams }: PageProps<"/vehiculos">): Promise<Metadata> {
  const raw = await searchParams;
  const f = parseSearchParams(raw);
  const brands = f.marca ? await getBrowseCatalog() : [];
  const brand = brands.find((b) => b.slug === f.marca);
  const model = brand?.models.find((m) => m.slug === f.modelo);
  const subject = [f.tipo ? BODY_TYPE_LABEL[f.tipo] : "Vehículos", brand?.name, model?.name, f.condicion && CONDITION_LABEL[f.condicion].toLowerCase()].filter(Boolean).join(" ");
  const title = `${subject} en venta en ${f.provincia ?? "República Dominicana"}`;
  return browseMetadata("/vehiculos", raw, title, `${title}. Compara precios, fotos y características de carros de dealers y vendedores particulares en TuCarroOnline.`);
}

export default async function VehiclesPage({ searchParams }: PageProps<"/vehiculos">) {
  const raw = await searchParams;
  const f = parseSearchParams(raw);
  const mapMode = f.vista === "mapa";
  const values = Object.fromEntries(
    new URLSearchParams(toQueryString(f).slice(1)).entries(),
  ) as Record<string, string>;
  if (f.q) {
    const href = resolveFreeText(prepareIndex(await getSearchIndex()), values);
    if (href) redirect(href);
    // Lo que el índice local no reconoce («familiar», «menos de un millón»…) lo interpreta Claude.
    const visitor = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "anon";
    const ai = await interpretSearch(f.q, values, visitor);
    if (ai) redirect(`/vehiculos?${new URLSearchParams(ai)}`);
  }

  const [result, facets, brands, features, points, modelTrims, usd] = await Promise.all([
    searchVehicles(f),
    getFacets(f),
    getBrowseCatalog(),
    db.feature.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, category: true, icon: true } }),
    mapMode ? searchMapPoints(f) : Promise.resolve([]),
    f.marca && f.modelo
      ? db.trim.findMany({ where: { model: { slug: f.modelo, brand: { slug: f.marca } } }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } })
      : Promise.resolve([]),
    getUsdRate(),
  ]);
  const usdRate = f.moneda === "usd" ? usd.rate : undefined;

  const brandName = brands.find((b) => b.slug === f.marca)?.name;
  const modelName = brands.find((b) => b.slug === f.marca)?.models.find((m) => m.slug === f.modelo)?.name;
  const trimName = modelTrims.find((t) => t.slug === f.version)?.name;
  const trims = modelTrims
    .map((t) => ({ slug: t.slug, name: t.name, count: facets.trims[t.id] ?? 0 }))
    .filter((t) => t.count > 0 || t.slug === f.version);
  const heading = [f.condicion && CONDITION_LABEL[f.condicion] + "s", f.tipo ? BODY_TYPE_LABEL[f.tipo] : null, brandName, modelName, trimName].filter(Boolean).join(" ") || "Todos los vehículos";

  const chips = activeChips(f, { brandName, modelName, trimName, features, usdRate });
  const qs = toQueryString(f);
  // Alerta de vehículos nuevos para esta búsqueda (solo filtros, sin orden ni página).
  const alertQuery = savedSearchQuery(f);
  const user = alertQuery ? await getCurrentUser() : null;
  const alertState = !user
    ? "anon"
    : (await db.savedSearch.count({ where: { userId: user.id, query: alertQuery } }))
      ? "saved"
      : "new";

  return (
    <>
      <PageHeader
        title={heading}
        description={result.total === 1 ? "1 vehículo encontrado" : `${result.total.toLocaleString("es-DO")} vehículos encontrados`}
        actions={
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
        }
      >
        <SearchBox key={qs} params={values} defaultValue={f.q} tone={LOOK === "banda" ? "dark" : "light"} className="mt-5 max-w-2xl" />
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {f.ia && (
          <p className="mb-3 flex items-start gap-2 text-sm text-muted" role="status">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <span>
              Interpretamos <strong className="text-ink">«{f.ia}»</strong> con estos filtros. Quita los que no quieras.
            </span>
          </p>
        )}
        {chips.length > 0 && (
          <ul className="mb-6 flex flex-wrap gap-2" aria-label="Filtros activos">
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
              <Link href={toQueryString({ vista: f.vista, moneda: f.moneda }) || "/vehiculos"} className="flex py-1.5 text-sm font-semibold text-accent hover:underline">
                Limpiar todo
              </Link>
            </li>
            {alertQuery && (
              <li className="sm:ml-auto">
                <SaveSearchButton key={alertQuery} query={alertQuery} name={chips.map((c) => c.label).join(", ")} state={alertState} />
              </li>
            )}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_1fr]">
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
              <Filters f={f} values={values} brands={brands} trims={trims} facets={facets} features={features} qs={qs} usdRate={usd.rate} />
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
                      <VehicleCard v={v} priority={i < 3} usdRate={usdRate} className="h-full" />
                    </li>
                  ))}
                </ul>
                {result.pages > 1 && <Pagination f={f} page={result.page} pages={result.pages} />}
              </>
            )}
          </section>
        </div>
      </div>
      <RecentlyViewed className="pb-16" />
    </>
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
  usdRate,
}: {
  f: SearchFilters;
  values: Record<string, string>;
  brands: BrowseBrand[];
  trims: { slug: string; name: string; count: number }[];
  facets: Awaited<ReturnType<typeof getFacets>>;
  features: { slug: string; name: string; category: import("@/generated/prisma/enums").FeatureCategory; icon: string }[];
  qs: string;
  usdRate: number;
}) {
  return (
    <FilterPanel
      usdRate={usdRate}
      resetKey={qs}
      values={values}
      selectedFeatures={f.car ?? []}
      brands={brands
        .map((b) => ({
          slug: b.slug,
          name: b.name,
          color: b.color,
          logo: b.logo,
          count: facets.brands[b.slug] ?? 0,
          models: b.models.map((m) => ({ slug: m.slug, name: m.name })),
        }))
        .filter((b) => b.count > 0 || b.slug === f.marca)}
      trims={trims}
      typeCounts={facets.types}
      prices={facets.prices}
      years={facets.years}
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
  ctx: { brandName?: string; modelName?: string; trimName?: string; features: { slug: string; name: string }[]; usdRate?: number },
): { label: string; remove: Remove }[] {
  const chips: { label: string; remove: Remove }[] = [];
  const price = (dop: number) => (ctx.usdRate ? formatPrice(toUsd(dop, ctx.usdRate), "USD") : formatPrice(dop, "DOP"));
  if (f.q) chips.push({ label: `“${f.q}”`, remove: { q: undefined } });
  if (f.condicion) chips.push({ label: CONDITION_LABEL[f.condicion], remove: { condicion: undefined } });
  if (f.tipo) chips.push({ label: BODY_TYPE_LABEL[f.tipo], remove: { tipo: undefined } });
  if (f.marca) chips.push({ label: ctx.brandName ?? f.marca, remove: { marca: undefined, modelo: undefined, version: undefined } });
  if (f.modelo) chips.push({ label: ctx.modelName ?? f.modelo, remove: { modelo: undefined, version: undefined } });
  if (f.modelo && f.version) chips.push({ label: ctx.trimName ?? f.version, remove: { version: undefined } });
  if (f.precioMin) chips.push({ label: `Desde ${price(f.precioMin)}`, remove: { precioMin: undefined } });
  if (f.precioMax) chips.push({ label: `Hasta ${price(f.precioMax)}`, remove: { precioMax: undefined } });
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
