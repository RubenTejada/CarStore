"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { BodyType, FeatureCategory } from "@/generated/prisma/enums";
import {
  BODY_TYPES,
  COLORS,
  DRIVETRAIN_LABEL,
  FEATURE_CATEGORY_LABEL,
  FUEL_LABEL,
  TRANSMISSION_LABEL,
} from "@/lib/labels";
import { cn } from "@/lib/cn";
import { input, label } from "@/components/ui/styles";
import { BodySilhouette } from "./body-silhouette";

type Props = {
  values: Record<string, string>;
  selectedFeatures: string[];
  brands: { slug: string; name: string; count: number; models: { slug: string; name: string }[] }[];
  /** Versiones del modelo elegido (vacío sin modelo). */
  trims: { slug: string; name: string; count: number }[];
  typeCounts: Partial<Record<BodyType, number>>;
  features: { slug: string; name: string; category: FeatureCategory }[];
  provinces: string[];
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 1 - i);
const KMS = [10_000, 30_000, 50_000, 80_000, 120_000, 160_000];

/**
 * Panel de filtros. Es un <form method="get"> normal (funciona sin JS);
 * con JS navega en cada cambio sin recargar.
 */
export function FilterPanel({ values, selectedFeatures, brands, trims, typeCounts, features, provinces }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [brand, setBrand] = useState(values.marca ?? "");
  const models = brands.find((b) => b.slug === brand)?.models ?? [];

  /** Vacía un campo dependiente (modelo, versión) cuando cambia el campo del que depende. */
  const clear = (name: string) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLSelectElement | null;
    if (el) el.value = "";
  };

  const apply = () => {
    const form = formRef.current!;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of data) {
      if (typeof v !== "string" || v === "" || k === "car") continue;
      params.set(k, v);
    }
    const car = data.getAll("car").join(",");
    if (car) params.set("car", car);
    if (values.orden) params.set("orden", values.orden);
    if (values.vista) params.set("vista", values.vista);
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  };

  const select = (name: string, labelText: string, options: [string, string][], all = "Todos") => (
    <div>
      <label htmlFor={`f-${name}`} className={label}>
        {labelText}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={values[name] ?? ""} className={input}>
        <option value="">{all}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const byCategory = Object.entries(FEATURE_CATEGORY_LABEL).map(([cat, name]) => ({
    name,
    items: features.filter((f) => f.category === cat),
  }));

  return (
    <form
      ref={formRef}
      method="get"
      action={pathname}
      onChange={(e) => {
        // Los campos numéricos se aplican al salir del campo o con Enter.
        const type = (e.target as unknown as HTMLInputElement).type;
        if (type === "number" || type === "search") return;
        apply();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className={cn("space-y-6 transition-opacity", pending && "opacity-60")}
      aria-busy={pending}
    >
      <div>
        <label htmlFor="f-q" className={label}>
          Palabra clave
        </label>
        <input id="f-q" name="q" type="search" defaultValue={values.q} placeholder="Ej. Corolla, Limited, 2021" className={input} />
      </div>

      <fieldset>
        <legend className={label}>Condición</legend>
        <div className="grid grid-cols-3 rounded-lg border border-line bg-surface p-1">
          {[
            ["", "Todos"],
            ["nuevo", "Nuevo"],
            ["usado", "Usado"],
          ].map(([v, l]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="condicion" value={v} defaultChecked={(values.condicion ?? "") === v} className="peer sr-only" />
              <span className="block rounded-md py-2 text-center text-sm font-semibold text-muted peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {l}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Tipo de vehículo</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="tipo" value="" defaultChecked={!values.tipo} className="peer sr-only" />
            <span className="flex h-full items-center justify-center rounded-lg border border-line bg-surface p-2 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              Todos
            </span>
          </label>
          {BODY_TYPES.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input type="radio" name="tipo" value={t.value.toLowerCase()} defaultChecked={values.tipo === t.value.toLowerCase()} className="peer sr-only" />
              <span className="flex flex-col items-center rounded-lg border border-line bg-surface p-2 text-center peer-checked:border-brand peer-checked:bg-brand/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                <BodySilhouette type={t.value} className="h-6 w-16 text-ink [--glass:var(--surface)] [--rim:var(--surface)] [--tire:var(--ink)]" />
                <span className="mt-1 text-xs font-semibold">{t.label}</span>
                <span className="text-[11px] text-muted">{typeCounts[t.value] ?? 0}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <div>
          <label htmlFor="f-marca" className={label}>
            Marca
          </label>
          <select
            id="f-marca"
            name="marca"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              clear("modelo");
              clear("version");
            }}
            className={input}
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-modelo" className={label}>
            Modelo
          </label>
          <select id="f-modelo" name="modelo" defaultValue={values.modelo ?? ""} key={brand} disabled={!brand} onChange={() => clear("version")} className={input}>
            <option value="">{brand ? "Todos los modelos" : "Elige una marca primero"}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        {trims.length > 0 && brand === values.marca && (
          <div>
            <label htmlFor="f-version" className={label}>
              Versión
            </label>
            <select id="f-version" name="version" defaultValue={values.version ?? ""} className={input}>
              <option value="">Todas las versiones</option>
              {trims.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t.count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <fieldset>
        <legend className={label}>Precio (RD$)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="precioMin" type="number" min={0} step={50000} inputMode="numeric" placeholder="Mínimo" aria-label="Precio mínimo" defaultValue={values.precioMin} onBlur={apply} className={input} />
          <input name="precioMax" type="number" min={0} step={50000} inputMode="numeric" placeholder="Máximo" aria-label="Precio máximo" defaultValue={values.precioMax} onBlur={apply} className={input} />
        </div>
        <p className="mt-1 text-xs text-muted">Precios en US$ se convierten a RD$ para comparar.</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        {select("anioMin", "Año desde", YEARS.map((y) => [String(y), String(y)]), "Cualquiera")}
        {select("anioMax", "Año hasta", YEARS.map((y) => [String(y), String(y)]), "Cualquiera")}
      </div>

      {select("kmMax", "Kilometraje máximo", KMS.map((k) => [String(k), `${k.toLocaleString("es-DO")} km`]), "Sin límite")}
      {select("transmision", "Transmisión", Object.entries(TRANSMISSION_LABEL).map(([k, v]) => [k.toLowerCase(), v]), "Todas")}
      {select("combustible", "Combustible", Object.entries(FUEL_LABEL).map(([k, v]) => [k.toLowerCase(), v]))}
      {select("traccion", "Tracción", Object.entries(DRIVETRAIN_LABEL).map(([k, v]) => [k.toLowerCase(), v]), "Todas")}
      {select("color", "Color exterior", COLORS.map((c) => [c, c]))}
      {select("provincia", "Provincia", provinces.map((p) => [p, p]), "Todo el país")}

      <fieldset>
        <legend className={label}>Características</legend>
        <div className="space-y-2">
          {byCategory.map((cat) => {
            const checked = cat.items.filter((f) => selectedFeatures.includes(f.slug)).length;
            return (
              <details key={cat.name} open={checked > 0} className="group rounded-lg border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {cat.name}
                  <span className="flex items-center gap-2 text-muted">
                    {checked > 0 && <span className="rounded-full bg-brand px-2 text-xs text-brand-ink">{checked}</span>}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                  </span>
                </summary>
                <div className="space-y-1 border-t border-line px-3 py-2">
                  {cat.items.map((f) => (
                    <label key={f.slug} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                      <input type="checkbox" name="car" value={f.slug} defaultChecked={selectedFeatures.includes(f.slug)} className="size-4 accent-[var(--brand)]" />
                      {f.name}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </fieldset>

      <noscript>
        <button type="submit" className="w-full rounded-lg bg-brand py-3 font-semibold text-brand-ink">
          Aplicar filtros
        </button>
      </noscript>
    </form>
  );
}
