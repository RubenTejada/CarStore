import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Calendar, Check, Cog, DoorOpen, Fuel, Gauge, MapPin, Minus, Palette, Plus, Route, Scale, Store, Tag, Users, Wrench, X, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { getUsdRate } from "@/lib/exchange-rate";
import { MAX_COMPARE, bestIndices, compareUrl, parseCompareIds, type CompareItem } from "@/lib/compare";
import { BODY_TYPE_LABEL, CONDITION_LABEL, DRIVETRAIN_LABEL, FEATURE_CATEGORY_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice, formatRate, toDop } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { FeatureIcon } from "@/lib/feature-icons";
import { BodySilhouette } from "@/components/browse/body-silhouette";
import { CompareSync } from "@/components/compare/compare-sync";
import { Gallery } from "@/components/vehicle/gallery";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { FeatureCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Comparar vehículos", robots: { index: false } };

type SpecRow = { label: string; icon: LucideIcon; values: (string | null)[]; best?: number[]; bestLabel?: string };

export default async function ComparePage({ searchParams }: PageProps<"/comparar">) {
  const raw = await searchParams;
  const ids = parseCompareIds(raw.ids);
  const onlyDiff = raw.dif === "1";

  const [found, usd] = await Promise.all([
    ids.length
      ? db.vehicle.findMany({
          where: { id: { in: ids }, status: "ACTIVE" },
          include: {
            model: { include: { brand: true } },
            dealer: { select: { name: true, slug: true, verified: true } },
            photos: { select: { url: true }, orderBy: { position: "asc" } },
            features: { include: { feature: true } },
          },
        })
      : [],
    getUsdRate(),
  ]);
  // Respeta el orden en que el visitante los eligió.
  const vehicles = ids.flatMap((id) => found.filter((v) => v.id === id));
  const items: CompareItem[] = vehicles.map((v) => ({ id: v.id, title: vehicleTitle(v), year: v.year, photo: v.photos[0]?.url }));
  const sync = <CompareSync items={items} fromUrl={raw.ids !== undefined} />;

  if (!vehicles.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        {sync}
        <Scale className="mx-auto size-10 text-brand" aria-hidden />
        <h1 className="display mt-4 text-3xl">Compara vehículos lado a lado</h1>
        <p className="mt-2 text-muted">Pulsa «Comparar» en hasta {MAX_COMPARE} vehículos y aquí verás sus precios, fichas técnicas y características frente a frente.</p>
        <Link href="/vehiculos" className={cn(button("primary", "md"), "mt-6")}>
          Buscar vehículos
        </Link>
      </div>
    );
  }

  // Todo se compara en pesos con la tasa del día; si hay monedas mixtas cada precio muestra su equivalente en la otra.
  const pricesDop = vehicles.map((v) => toDop(v.price, v.currency, usd.rate));
  const hasUsd = vehicles.some((v) => v.currency === "USD");
  const mixed = hasUsd && vehicles.some((v) => v.currency === "DOP");
  const specs: SpecRow[] = [
    {
      label: "Precio",
      icon: Tag,
      values: vehicles.map((v, i) =>
        v.currency === "USD"
          ? `${formatPrice(v.price, v.currency)} (≈ ${formatPrice(pricesDop[i], "DOP")})`
          : mixed
            ? `${formatPrice(v.price, v.currency)} (≈ ${formatPrice(Math.round(v.price / usd.rate), "USD")})`
            : formatPrice(v.price, v.currency),
      ),
      best: bestIndices(pricesDop, "min"),
      bestLabel: "Más económico",
    },
    { label: "Año", icon: Calendar, values: vehicles.map((v) => String(v.year)), best: bestIndices(vehicles.map((v) => v.year), "max"), bestLabel: "Más reciente" },
    { label: "Kilometraje", icon: Gauge, values: vehicles.map((v) => formatKm(v.mileageKm)), best: bestIndices(vehicles.map((v) => v.mileageKm), "min"), bestLabel: "Menos uso" },
    { label: "Condición", icon: BadgeCheck, values: vehicles.map((v) => CONDITION_LABEL[v.condition]) },
    { label: "Transmisión", icon: Cog, values: vehicles.map((v) => TRANSMISSION_LABEL[v.transmission]) },
    { label: "Combustible", icon: Fuel, values: vehicles.map((v) => FUEL_LABEL[v.fuel]) },
    { label: "Tracción", icon: Route, values: vehicles.map((v) => DRIVETRAIN_LABEL[v.drivetrain]) },
    { label: "Motor", icon: Wrench, values: vehicles.map((v) => v.engine) },
    { label: "Color exterior", icon: Palette, values: vehicles.map((v) => v.extColor) },
    { label: "Color interior", icon: Palette, values: vehicles.map((v) => v.intColor) },
    { label: "Puertas", icon: DoorOpen, values: vehicles.map((v) => (v.doors ? String(v.doors) : null)) },
    { label: "Pasajeros", icon: Users, values: vehicles.map((v) => (v.seats ? String(v.seats) : null)), best: bestIndices(vehicles.map((v) => v.seats), "max"), bestLabel: "Más plazas" },
    { label: "Ubicación", icon: MapPin, values: vehicles.map((v) => v.province) },
    { label: "Vendedor", icon: Store, values: vehicles.map((v) => v.dealer?.name ?? "Vendedor particular") },
  ];

  // Unión de las características de todos, por categoría, para ver quién tiene qué.
  const featureMap = new Map(vehicles.flatMap((v) => v.features.map((f) => [f.feature.id, f.feature] as const)));
  const hasFeature = vehicles.map((v) => new Set(v.features.map((f) => f.featureId)));
  const featureCounts = hasFeature.map((s) => s.size);
  const featureGroups = (Object.keys(FEATURE_CATEGORY_LABEL) as FeatureCategory[])
    .map((cat) => ({
      cat,
      rows: [...featureMap.values()]
        .filter((f) => f.category === cat)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((f) => ({ feature: f, values: hasFeature.map((s) => s.has(f.id)) }))
        .filter((r) => !onlyDiff || !allSame(r.values)),
    }))
    .filter((g) => g.rows.length);

  const bodyRowSame = allSame(vehicles.map((v) => v.bodyType));
  const visibleSpecs = specs.filter((r) => !onlyDiff || !allSame(r.values));
  const canAdd = vehicles.length < MAX_COMPARE;
  const columns = vehicles.length + (canAdd ? 1 : 0);
  const others = (id: string) => vehicles.filter((v) => v.id !== id).map((v) => v.id);
  const cell = "border-t border-line px-3 py-3 align-top sm:px-4";
  const labelCell = "sticky left-0 z-10 bg-surface text-left font-medium text-muted shadow-[1px_0_0_var(--line)]";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {sync}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">Comparar vehículos</h1>
          <p className="mt-1 text-muted">
            {vehicles.length < 2 ? "Agrega al menos otro vehículo para compararlos." : `${vehicles.map((v) => vehicleTitle(v)).join(" vs ")}`}
          </p>
        </div>
        {vehicles.length >= 2 && (
          <nav className="flex rounded-lg border border-line bg-surface p-1" aria-label="Filas">
            {[
              [false, "Todo"],
              [true, "Solo diferencias"],
            ].map(([diff, text]) => (
              <Link
                key={String(text)}
                href={compareUrl(ids, diff as boolean)}
                aria-current={onlyDiff === diff ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", onlyDiff === diff ? "bg-brand text-brand-ink" : "text-muted hover:text-ink")}
              >
                {text}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: `${8.5 + columns * 12}rem` }}>
          <caption className="sr-only">Comparación de {vehicles.length} vehículos</caption>
          <colgroup>
            <col className="w-34 sm:w-48" />
            {Array.from({ length: columns }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <td className={cn(labelCell, "p-3 sm:p-4")} />
              {vehicles.map((v, i) => (
                <th key={v.id} scope="col" className="p-3 text-left align-top font-normal sm:p-4">
                  {/* Intervalos distintos por columna para que no cambien todas a la vez. */}
                  <Gallery compact autoplay={4500 + i * 900} photos={v.photos.map((p) => p.url)} alt={`${vehicleTitle(v)} ${v.year}`} sizes="(min-width: 1024px) 25vw, 50vw">
                    <span className="plate pointer-events-none absolute bottom-2 left-2 z-10 text-xs">{v.year}</span>
                    <Link
                      href={compareUrl(others(v.id), onlyDiff)}
                      className="absolute top-2 right-2 z-20 grid size-7 place-items-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur hover:bg-surface"
                      aria-label={`Quitar ${vehicleTitle(v)} ${v.year} de la comparación`}
                    >
                      <X className="size-4" aria-hidden />
                    </Link>
                  </Gallery>
                  <Link href={vehicleUrl(v)} className="wide mt-3 block text-base leading-tight font-bold hover:underline">
                    {vehicleTitle(v)}
                    {v.trim && <span className="block text-sm font-normal text-muted">{v.trim}</span>}
                  </Link>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-brand">{formatPrice(v.price, v.currency)}</p>
                </th>
              ))}
              {canAdd && (
                <td className="p-3 align-top sm:p-4">
                  <Link
                    href="/vehiculos"
                    className="grid aspect-[3/2] place-items-center rounded-lg border-2 border-dashed border-line text-center font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    <span>
                      <Plus className="mx-auto size-6" aria-hidden />
                      Agregar vehículo
                    </span>
                  </Link>
                </td>
              )}
            </tr>
          </thead>

          <tbody>
            <SectionRow title="Ficha técnica" span={columns + 1} />
            {(!onlyDiff || !bodyRowSame) && (
              <tr>
                <th scope="row" className={cn(cell, labelCell)}>
                  <span className="flex items-center gap-2">
                    <BodySilhouette type={vehicles[0].bodyType} className="h-4 w-9 shrink-0 text-brand [--glass:var(--surface)] [--rim:var(--surface)] [--tire:var(--brand)]" />
                    Carrocería
                  </span>
                </th>
                {vehicles.map((v) => (
                  <td key={v.id} className={cn(cell, "font-semibold")}>
                    {BODY_TYPE_LABEL[v.bodyType]}
                  </td>
                ))}
                {canAdd && <td className={cell} />}
              </tr>
            )}
            {visibleSpecs.map((r) => (
              <tr key={r.label}>
                <th scope="row" className={cn(cell, labelCell)}>
                  <span className="flex items-center gap-2">
                    <r.icon className="size-4 shrink-0 text-brand" aria-hidden />
                    {r.label}
                  </span>
                </th>
                {r.values.map((val, i) => {
                  const best = r.best?.includes(i);
                  return (
                    <td key={vehicles[i].id} className={cn(cell, "font-semibold", best && "bg-ok/8")}>
                      {val ?? <span className="font-normal text-muted">—</span>}
                      {best && (
                        <span className="mt-1 flex w-fit items-center gap-1 rounded bg-ok/15 px-1.5 py-0.5 text-[11px] font-bold text-ok">
                          <Check className="size-3" aria-hidden />
                          {r.bestLabel}
                        </span>
                      )}
                    </td>
                  );
                })}
                {canAdd && <td className={cell} />}
              </tr>
            ))}

            {featureMap.size > 0 && (
              <>
                <SectionRow title="Características y facilidades" span={columns + 1} />
                <tr>
                  <th scope="row" className={cn(cell, labelCell)}>
                    Total
                  </th>
                  {featureCounts.map((n, i) => {
                    const best = bestIndices(featureCounts, "max").includes(i);
                    return (
                      <td key={vehicles[i].id} className={cn(cell, "font-semibold", best && "bg-ok/8")}>
                        {n} de {featureMap.size}
                        {best && (
                          <span className="mt-1 flex w-fit items-center gap-1 rounded bg-ok/15 px-1.5 py-0.5 text-[11px] font-bold text-ok">
                            <Check className="size-3" aria-hidden />
                            Más equipado
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {canAdd && <td className={cell} />}
                </tr>
                {featureGroups.map((g) => (
                  <FeatureGroup key={g.cat} title={FEATURE_CATEGORY_LABEL[g.cat]} rows={g.rows} ids={vehicles.map((v) => v.id)} canAdd={canAdd} cell={cell} labelCell={labelCell} />
                ))}
              </>
            )}

            {onlyDiff && !visibleSpecs.length && !featureGroups.length && bodyRowSame && (
              <tr>
                <td colSpan={columns + 1} className={cn(cell, "py-8 text-center text-muted")}>
                  No hay diferencias entre estos vehículos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        {hasUsd &&
          (usd.publishedOn
            ? `Los precios en USD se comparan convertidos a pesos con la tasa de venta del Banco Central del ${usd.publishedOn.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}: ${formatRate(usd.rate)} por US$1. `
            : `Los precios en USD se comparan convertidos a pesos con una tasa de referencia de ${formatRate(usd.rate)} por US$1. `)}
        Confirma los datos con el vendedor antes de decidir.
      </p>
    </div>
  );
}

function SectionRow({ title, span }: { title: string; span: number }) {
  return (
    <tr>
      <th colSpan={span} scope="colgroup" className="border-t border-line bg-surface-2/60 px-3 py-2.5 text-left sm:px-4">
        <span className="sticky left-3 sm:left-4 display text-lg">{title}</span>
      </th>
    </tr>
  );
}

function FeatureGroup({
  title,
  rows,
  ids,
  canAdd,
  cell,
  labelCell,
}: {
  title: string;
  rows: { feature: { id: string; name: string; icon: string }; values: boolean[] }[];
  ids: string[];
  canAdd: boolean;
  cell: string;
  labelCell: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={ids.length + 1 + (canAdd ? 1 : 0)} scope="colgroup" className="border-t border-line px-3 pt-4 pb-1 text-left sm:px-4">
          <span className="wide sticky left-3 text-xs font-bold tracking-wide text-muted uppercase sm:left-4">{title}</span>
        </th>
      </tr>
      {rows.map(({ feature, values }) => (
        <tr key={feature.id}>
          <th scope="row" className={cn(cell, labelCell, "font-normal text-ink")}>
            <span className="flex items-center gap-2">
              <FeatureIcon icon={feature.icon} className="size-4 shrink-0 text-brand" />
              {feature.name}
            </span>
          </th>
          {values.map((yes, i) => (
            <td key={ids[i]} className={cell}>
              {yes ? (
                <span className="grid size-6 place-items-center rounded-full bg-ok/15 text-ok">
                  <Check className="size-4" aria-hidden />
                  <span className="sr-only">Sí</span>
                </span>
              ) : (
                <span className="grid size-6 place-items-center text-muted/60">
                  <Minus className="size-4" aria-hidden />
                  <span className="sr-only">No</span>
                </span>
              )}
            </td>
          ))}
          {canAdd && <td className={cell} />}
        </tr>
      ))}
    </>
  );
}

function allSame<T>(values: T[]) {
  return values.every((v) => v === values[0]);
}
