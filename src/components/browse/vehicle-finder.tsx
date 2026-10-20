"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronLeft, Droplets, Flame, Fuel as FuelIcon, Gauge, Infinity as InfinityIcon, Joystick, Leaf, Search, Zap, type LucideIcon } from "lucide-react";
import type { BodyType, Fuel, Transmission } from "@/generated/prisma/enums";
import { BODY_TYPES, FUEL_LABEL, TRANSMISSION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { FeatureIcon } from "@/lib/feature-icons";
import type { StockRow } from "@/lib/catalog";
import { BodySilhouette } from "./body-silhouette";
import { BrandLogo, type BrandMark } from "./brand-logo";
import { prefetchFinderFacets, useFinderFacets } from "./use-finder-facets";

type FinderBrand = BrandMark & {
  slug: string;
  models: { slug: string; name: string; bodyType: BodyType; stock: StockRow[] }[];
};

type StockFilter = { type: BodyType | null; condition: StockRow["condition"] | null; fuel: Fuel | null; transmission: Transmission | null };

/** Vehículos que cumplen los filtros elegidos (sin carrocería si `ignoreType`). */
const count = (stock: StockRow[], f: StockFilter, ignoreType = false) =>
  stock.reduce(
    (a, r) =>
      (ignoreType || !f.type || r.bodyType === f.type) &&
      (!f.condition || r.condition === f.condition) &&
      (!f.fuel || r.fuel === f.fuel) &&
      (!f.transmission || r.transmission === f.transmission)
        ? a + r.n
        : a,
    0,
  );

const STEPS = ["Tipo", "Marca", "Modelo"];

const FUELS: { value: Fuel; icon: LucideIcon }[] = [
  { value: "GASOLINE", icon: FuelIcon },
  { value: "DIESEL", icon: Droplets },
  { value: "HYBRID", icon: Leaf },
  { value: "ELECTRIC", icon: Zap },
  { value: "GLP", icon: Flame },
];

const TRANSMISSIONS: { value: Transmission; icon: LucideIcon }[] = [
  { value: "AUTOMATIC", icon: Gauge },
  { value: "MANUAL", icon: Joystick },
  { value: "CVT", icon: InfinityIcon },
];

export function VehicleFinder({ brands }: { brands: FinderBrand[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [type, setType] = useState<BodyType | null>(null);
  const [brand, setBrandState] = useState<FinderBrand | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [condition, setCondition] = useState<"" | "nuevo" | "usado">("");
  const [driving, setDriving] = useState<BodyType | null>(null);
  const [fuel, setFuel] = useState<Fuel | null>(null);
  const [transmission, setTransmission] = useState<Transmission | null>(null);

  // El carro arranca y sale de la escena antes de pasar al paso de marcas.
  const chooseType = (t: BodyType) => {
    if (reduce) return setType(t);
    setDriving(t);
    setTimeout(() => {
      setType(t);
      setDriving(null);
    }, 520);
  };
  const step = brand ? 2 : type ? 1 : 0;
  // Cambiar de marca descarta el modelo elegido; las características se conservan.
  const setBrand = (b: FinderBrand | null) => {
    setBrandState(b);
    setModel(null);
  };
  const toggleFeature = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  const filter = useMemo<StockFilter>(
    () => ({ type, condition: condition === "nuevo" ? "NEW" : condition === "usado" ? "USED" : null, fuel, transmission }),
    [type, condition, fuel, transmission],
  );

  const typeCounts = useMemo(() => {
    const out = {} as Record<BodyType, number>;
    for (const b of brands)
      for (const m of b.models) for (const r of m.stock) if (count([r], filter, true)) out[r.bodyType] = (out[r.bodyType] ?? 0) + r.n;
    return out;
  }, [brands, filter]);

  const brandsForType = useMemo(
    () =>
      brands
        .map((b) => ({ brand: b, count: b.models.reduce((a, m) => a + count(m.stock, filter), 0) }))
        .filter((b) => b.count > 0)
        .sort((a, b) => b.count - a.count),
    [brands, filter],
  );

  // Mismos parámetros que /vehiculos: sirven para los enlaces y para pedir las facetas.
  const params = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (condition) p.set("condicion", condition);
    if (type) p.set("tipo", type.toLowerCase());
    if (fuel) p.set("combustible", fuel.toLowerCase());
    if (transmission) p.set("transmision", transmission.toLowerCase());
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    return p.toString();
  };
  const href = (extra: Record<string, string | undefined>) => `/vehiculos?${params(extra)}`;
  const selection = (b: FinderBrand) => ({ marca: b.slug, modelo: b === brand ? (model ?? undefined) : undefined, car: [...picked].sort().join(",") || undefined });

  // Facetas del paso de modelos: conteos por modelo y características con resultados para la selección.
  const facets = useFinderFacets(brand ? params(selection(brand)) : null);
  const facetsForBrand = brand && facets.dataQuery && new URLSearchParams(facets.dataQuery).get("marca") === brand.slug ? facets.data : null;

  const typeInfo = BODY_TYPES.find((t) => t.value === type);
  const slide = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, x: -40 },
    transition: { duration: 0.28, ease: [0.2, 0.7, 0.2, 1] as const },
  };

  return (
    <div className="text-white">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="relative min-w-0 flex-1 basis-72"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q")?.toString().trim();
            router.push(href({ q }));
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/60" aria-hidden />
          <input
            name="q"
            placeholder="Busca por marca, modelo o año: Corolla 2020"
            aria-label="Buscar vehículos"
            className="h-13 w-full rounded-xl border border-white/15 bg-white/10 pr-4 pl-12 text-base text-white placeholder:text-white/55 focus:border-white/50 focus:outline-none"
          />
        </form>
        <div role="radiogroup" aria-label="Condición" className="flex rounded-xl border border-white/15 bg-white/5 p-1">
          {(
            [
              ["", "Todos"],
              ["nuevo", "Nuevos"],
              ["usado", "Usados"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={condition === value}
              onClick={() => setCondition(value)}
              className={cn(
                "h-11 rounded-lg px-4 text-sm font-semibold transition-colors",
                condition === value ? "bg-white text-night" : "text-white/75 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <ChipGroup
          label="Combustible"
          options={FUELS.map((f) => ({ ...f, label: FUEL_LABEL[f.value] }))}
          value={fuel}
          onChange={setFuel}
        />
        <ChipGroup
          label="Transmisión"
          options={TRANSMISSIONS.map((t) => ({ ...t, label: TRANSMISSION_LABEL[t.value] }))}
          value={transmission}
          onChange={setTransmission}
        />
      </div>

      <ol className="mt-8 flex items-center gap-2 text-sm" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              type="button"
              disabled={i > step}
              onClick={() => {
                if (i === 0) {
                  setType(null);
                  setBrand(null);
                } else if (i === 1) setBrand(null);
              }}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors",
                i === step ? "bg-white text-night" : i < step ? "text-white hover:bg-white/10" : "text-white/40",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs font-bold",
                  i === step ? "bg-accent text-white" : i < step ? "bg-white/20" : "border border-white/25",
                )}
              >
                {i + 1}
              </span>
              {i === 0 && typeInfo ? typeInfo.plural : i === 1 && brand ? brand.name : s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-white/25" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="relative mt-5 min-h-[17rem]">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div key="types" {...slide}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BODY_TYPES.map((t, i) => {
                  const n = typeCounts[t.value] ?? 0;
                  return (
                    <motion.li
                      key={t.value}
                      initial={reduce ? false : { opacity: 0, x: -60 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 140, damping: 18 }}
                    >
                      <button
                        type="button"
                        disabled={n === 0 || driving !== null}
                        onClick={() => chooseType(t.value)}
                        data-driving={driving === t.value || undefined}
                        className="group flex h-full w-full flex-col items-start rounded-xl border border-white/10 bg-white/[0.06] p-4 text-left transition-colors hover:border-white/40 hover:bg-white/[0.12] disabled:opacity-40 data-[driving]:border-white/40 data-[driving]:bg-white/[0.12] data-[driving]:opacity-100"
                      >
                        <span className="relative block h-16 w-full overflow-hidden rounded-lg" aria-hidden>
                          <span className="scene-item scene-hill" />
                          <span className="scene-item scene-cloud" />
                          <span className="scene-item scene-palm" />
                          <span className="scene-item scene-palm scene-palm-2" />
                          <span className="scene-road" />
                          <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2">
                            <BodySilhouette
                              type={t.value}
                              className="scene-car block h-10 w-[100px] text-white sm:h-12 sm:w-[120px] [--glass:rgba(11,26,54,0.55)] [--rim:#8fa3c4] [--tire:#050b18]"
                            />
                          </span>
                        </span>
                        <span className="wide mt-3 text-[15px] font-bold">{t.label}</span>
                        <span className="text-sm text-white/60">{n === 1 ? "1 vehículo" : `${n} vehículos`}</span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="brands" {...slide}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <BackButton onClick={() => setType(null)} />
                <Link href={href({})} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                  Ver todas las {typeInfo?.plural.toLowerCase()}
                </Link>
              </div>
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {brandsForType.map(({ brand: b, count }, i) => (
                  <motion.li
                    key={b.slug}
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    <button
                      type="button"
                      onClick={() => setBrand(b)}
                      onPointerEnter={() => prefetchFinderFacets(params(selection(b)))}
                      onFocus={() => prefetchFinderFacets(params(selection(b)))}
                      className="group flex w-full flex-col items-center gap-2 rounded-xl bg-white px-2 py-4 text-night transition-transform hover:-translate-y-0.5"
                    >
                      <BrandLogo brand={b} colored className="size-10 grayscale transition-[filter] group-hover:grayscale-0" />
                      <span className="text-sm font-semibold">{b.name}</span>
                      <span className="text-xs text-[#566176]">{count}</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {step === 2 && brand && (
            <motion.div key="models" {...slide}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <BackButton onClick={() => setBrand(null)} />
                <Link href={href({ marca: brand.slug })} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                  Ver todos los {brand.name}
                </Link>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-white p-4 text-night">
                <BrandLogo brand={brand} colored className="size-14 shrink-0" />
                <div>
                  <p className="display text-2xl">{brand.name}</p>
                  <p className="text-sm text-[#566176]">Elige un modelo y las características que buscas</p>
                </div>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white/70">Modelo</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {brand.models
                  .filter((m) => count(m.stock, filter) > 0)
                  .map((m, i) => {
                    const on = model === m.slug;
                    // Con características elegidas, el conteo exacto viene del servidor.
                    const n = facetsForBrand ? (facetsForBrand.models[m.slug] ?? 0) : count(m.stock, filter);
                    return (
                      <motion.li
                        key={m.slug}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <button
                          type="button"
                          aria-pressed={on}
                          disabled={!on && n === 0}
                          onClick={() => setModel(on ? null : m.slug)}
                          className={cn(
                            "flex min-h-11 items-center gap-2.5 rounded-full border py-2 pr-3 pl-3.5 font-semibold transition-colors disabled:opacity-40",
                            on ? "border-white bg-white text-night" : "border-white/20 bg-white/10 hover:border-white/50",
                          )}
                        >
                          <BodySilhouette type={m.bodyType} className="h-4 w-10 shrink-0 [--glass:rgba(11,26,54,0.45)] [--rim:#8fa3c4] [--tire:#050b18]" />
                          {m.name}
                          <span className={cn("rounded-full px-2 text-xs", on ? "bg-night/10" : "bg-black/25")}>{n}</span>
                        </button>
                      </motion.li>
                    );
                  })}
              </ul>

              <h3 className="mt-5 text-sm font-semibold text-white/70">Características principales</h3>
              <div aria-busy={facets.loading} className={cn("transition-opacity", facets.loading && facetsForBrand && "opacity-60")}>
                {facetsForBrand ? (
                  facetsForBrand.features.length > 0 ? (
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {facetsForBrand.features.map((f) => {
                        const on = picked.includes(f.slug);
                        return (
                          <li key={f.slug}>
                            <button
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleFeature(f.slug)}
                              className={cn(
                                "flex h-full min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
                                on ? "border-white bg-white text-night" : "border-white/15 bg-white/[0.06] hover:border-white/40",
                              )}
                            >
                              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", on ? "bg-accent text-white" : "bg-white/10")}>
                                {on ? <Check className="size-4" aria-hidden /> : <FeatureIcon icon={f.icon} className="size-4" />}
                              </span>
                              <span className="flex-1">{f.name}</span>
                              <span className={cn("rounded-full px-2 text-xs", on ? "bg-night/10" : "bg-black/25")}>{f.n}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-white/60">Estos vehículos no tienen características registradas.</p>
                  )
                ) : facets.error ? (
                  <p className="mt-2 text-sm text-white/60">No se pudieron cargar las características. Puedes ver los vehículos igualmente.</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cargando características">
                    {Array.from({ length: 8 }, (_, i) => (
                      <li key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.06]" />
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={href({ marca: brand.slug, modelo: model ?? undefined, car: picked.join(",") || undefined })}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  {facetsForBrand && !facets.loading ? (facetsForBrand.total === 1 ? "Ver 1 vehículo" : `Ver ${facetsForBrand.total} vehículos`) : "Ver vehículos"}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                {picked.length > 0 && (
                  <button type="button" onClick={() => setPicked([])} className="h-11 rounded-lg px-2 text-sm font-semibold text-white/75 hover:text-white">
                    Quitar características ({picked.length})
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Opciones de selección única que se pueden desmarcar (tocar de nuevo quita el filtro). */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; icon: LucideIcon }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm font-semibold text-white/60">{label}</span>
      {options.map(({ value: v, label: l, icon: Icon }) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : v)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
              on ? "border-white bg-white text-night" : "border-white/15 bg-white/5 text-white/80 hover:border-white/40 hover:text-white",
            )}
          >
            <Icon className={cn("size-4", on ? "text-accent" : "text-white/60")} aria-hidden />
            {l}
          </button>
        );
      })}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-semibold text-white/80 hover:text-white">
      <ChevronLeft className="size-4" aria-hidden />
      Atrás
    </button>
  );
}
