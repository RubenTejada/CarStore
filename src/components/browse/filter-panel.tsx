"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutGrid, type LucideIcon } from "lucide-react";
import type { BodyType, FeatureCategory } from "@/generated/prisma/enums";
import {
  BODY_TYPES,
  COLOR_HEX,
  COLORS,
  DRIVETRAIN_LABEL,
  FEATURE_CATEGORY_LABEL,
  FUEL_LABEL,
  TRANSMISSION_LABEL,
} from "@/lib/labels";
import { cn } from "@/lib/cn";
import { input, label } from "@/components/ui/styles";
import { FUEL_ICON, TRANSMISSION_ICON } from "@/lib/spec-icons";
import { FeatureIcon } from "@/lib/feature-icons";
import { BodySilhouette } from "./body-silhouette";
import { BrandLogo, type BrandMark } from "./brand-logo";

type Props = {
  values: Record<string, string>;
  selectedFeatures: string[];
  brands: (BrandMark & { slug: string; count: number; models: { slug: string; name: string }[] })[];
  /** Versiones del modelo elegido (vacío sin modelo). */
  trims: { slug: string; name: string; count: number }[];
  typeCounts: Partial<Record<BodyType, number>>;
  features: { slug: string; name: string; category: FeatureCategory; icon: string }[];
  provinces: string[];
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 1 - i);
const KMS = [10_000, 30_000, 50_000, 80_000, 120_000, 160_000];
/** Marcas visibles antes de "Más marcas" (la elegida siempre se ve). */
const TOP_BRANDS = 8;

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
        <BrandPicker
          brands={brands}
          value={brand}
          onChange={(v) => {
            setBrand(v);
            clear("modelo");
            clear("version");
          }}
        />
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

      <ChoiceChips
        name="kmMax"
        legend="Kilometraje máximo"
        value={values.kmMax}
        allLabel="Sin límite"
        options={KMS.map((k) => ({ value: String(k), label: `${k / 1000} mil km` }))}
      />
      <ChoiceChips
        name="transmision"
        legend="Transmisión"
        value={values.transmision}
        allLabel="Todas"
        options={Object.entries(TRANSMISSION_LABEL).map(([k, v]) => ({ value: k.toLowerCase(), label: v, icon: TRANSMISSION_ICON[k as keyof typeof TRANSMISSION_ICON] }))}
      />
      <ChoiceChips
        name="combustible"
        legend="Combustible"
        value={values.combustible}
        options={Object.entries(FUEL_LABEL).map(([k, v]) => ({ value: k.toLowerCase(), label: v, icon: FUEL_ICON[k as keyof typeof FUEL_ICON] }))}
      />
      <ChoiceChips
        name="traccion"
        legend="Tracción"
        value={values.traccion}
        allLabel="Todas"
        options={Object.entries(DRIVETRAIN_LABEL).map(([k, v]) => ({ value: k.toLowerCase(), label: v }))}
      />
      <ColorSwatches value={values.color} />
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
                      <FeatureIcon icon={f.icon} className="size-4 shrink-0 text-muted" />
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

const chip =
  "flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

/** Opción única entre pocas opciones: chips (radios) con icono opcional y una opción "Todos". */
function ChoiceChips({
  name,
  legend,
  value = "",
  allLabel = "Todos",
  options,
}: {
  name: string;
  legend: string;
  value?: string;
  allLabel?: string;
  options: { value: string; label: string; icon?: LucideIcon }[];
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {[{ value: "", label: allLabel }, ...options].map(({ value: v, label: l, icon: Icon }) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={name} value={v} defaultChecked={value === v} className="peer sr-only" />
            <span className={chip}>
              {Icon && <Icon className="size-4" aria-hidden />}
              {l}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ColorSwatches({ value = "" }: { value?: string }) {
  return (
    <fieldset>
      <legend className={label}>Color exterior</legend>
      <div className="grid grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-7 lg:grid-cols-5">
        {[{ name: "", fill: "conic-gradient(#c81e2d, #f5c400, #2f7d46, #1e4fa3, #111111, #ffffff, #c81e2d)" }, ...COLORS.map((c) => ({ name: c, fill: COLOR_HEX[c] }))].map(
          ({ name, fill }) => (
            <label key={name} className="flex cursor-pointer flex-col items-center gap-1">
              <input type="radio" name="color" value={name} defaultChecked={value === name} className="peer sr-only" />
              <span
                className="size-8 rounded-full border border-line shadow-inner ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                style={{ background: fill }}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted peer-checked:font-bold peer-checked:text-ink">{name || "Todos"}</span>
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}

/** Marcas con logo; las más buscadas primero y el resto bajo "Más marcas". */
function BrandPicker({
  brands,
  value,
  onChange,
}: {
  brands: (BrandMark & { slug: string; count: number })[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const sorted = [...brands].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const top = sorted.slice(0, TOP_BRANDS);
  const rest = sorted.slice(TOP_BRANDS);
  const chosenInRest = rest.find((b) => b.slug === value);
  if (chosenInRest) top.push(chosenInRest);
  const more = rest.filter((b) => b !== chosenInRest);

  const tile = (b: { slug: string; name: string; count?: number; mark?: BrandMark }) => (
    <label key={b.slug} className="cursor-pointer">
      <input type="radio" name="marca" value={b.slug} checked={value === b.slug} onChange={() => onChange(b.slug)} className="peer sr-only" />
      <span className="flex h-full flex-col items-center justify-center rounded-lg border border-line bg-surface p-2 text-center transition-colors hover:border-ink peer-checked:border-brand peer-checked:bg-brand/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        {b.mark ? <BrandLogo brand={b.mark} colored className="size-7" /> : <LayoutGrid className="size-7 p-0.5 text-muted" aria-hidden />}
        <span className="mt-1 w-full text-xs leading-tight font-semibold break-words">{b.name}</span>
        {b.count !== undefined && <span className="text-[11px] text-muted">{b.count}</span>}
      </span>
    </label>
  );
  const brandTile = (b: BrandMark & { slug: string; count: number }) => tile({ slug: b.slug, name: b.name, count: b.count, mark: b });

  return (
    <fieldset>
      <legend className={label}>Marca</legend>
      <div className="grid grid-cols-3 gap-2">
        {tile({ slug: "", name: "Todas" })}
        {top.map(brandTile)}
      </div>
      {more.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
            Más marcas ({more.length})
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-2 grid grid-cols-3 gap-2">{more.map(brandTile)}</div>
        </details>
      )}
    </fieldset>
  );
}
