"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, type LucideIcon } from "lucide-react";
import type { BodyType, Fuel, Transmission } from "@/generated/prisma/enums";
import { BODY_TYPES, FUEL_LABEL, TRANSMISSION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { FUEL_ICON, TRANSMISSION_ICON } from "@/lib/spec-icons";
import type { StockRow } from "@/lib/catalog";
import { BodySilhouette } from "./body-silhouette";
import { BodyTypeScene } from "./body-type-scene";
import { SearchBox } from "./search-box";
import { BrandLogo, BrandTileBody, brandCell, brandGrid, brandTile, type BrandMark } from "./brand-logo";

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

const FUELS = (Object.keys(FUEL_ICON) as Fuel[]).map((value) => ({ value, icon: FUEL_ICON[value] }));
const TRANSMISSIONS = (Object.keys(TRANSMISSION_ICON) as Transmission[]).map((value) => ({ value, icon: TRANSMISSION_ICON[value] }));

export function VehicleFinder({ brands }: { brands: FinderBrand[] }) {
  const reduce = useReducedMotion();
  const [type, setType] = useState<BodyType | null>(null);
  const [brand, setBrand] = useState<FinderBrand | null>(null);
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
        .map((b) => {
          const counts = b.models.map((m) => count(m.stock, filter));
          const available = b.models.filter((_, i) => counts[i] > 0);
          return { brand: b, count: counts.reduce((a, n) => a + n, 0), onlyModel: available.length === 1 ? available[0] : null };
        })
        .filter((b) => b.count > 0)
        .sort((a, b) => b.count - a.count),
    [brands, filter],
  );

  // Mismos parámetros que /vehiculos.
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
  const models = brand ? brand.models.map((m) => ({ ...m, n: count(m.stock, filter) })).filter((m) => m.n > 0) : [];
  const total = models.reduce((a, m) => a + m.n, 0);

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
        <SearchBox
          tone="dark"
          params={Object.fromEntries(new URLSearchParams(params({})))}
          placeholder="Marca, modelo, versión o tipo: jeepeta Toyota 2020"
          className="min-w-0 flex-1 basis-72"
        />
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
                        <BodyTypeScene type={t.value} />
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
              <ul className={brandGrid}>
                {brandsForType.map(({ brand: b, count, onlyModel }, i) => (
                  <motion.li
                    key={b.slug}
                    className={brandCell}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.035 }}
                  >
                    {/* Con un solo modelo no hay nada que elegir: directo a los resultados. */}
                    {onlyModel ? (
                      <Link href={href({ marca: b.slug, modelo: onlyModel.slug })} className={cn("relative", brandTile)}>
                        <BrandTileBody brand={b} count={count} lively />
                      </Link>
                    ) : (
                      <button type="button" onClick={() => setBrand(b)} className={cn("relative", brandTile)}>
                        <BrandTileBody brand={b} count={count} lively />
                      </button>
                    )}
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
                  <p className="text-sm text-[#566176]">Elige un modelo</p>
                </div>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-white/70">Modelo</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {models.map((m, i) => (
                  <motion.li
                    key={m.slug}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={href({ marca: brand.slug, modelo: m.slug })}
                      className="flex min-h-11 items-center gap-2.5 rounded-full border border-white/20 bg-white/10 py-2 pr-3 pl-3.5 font-semibold transition-colors hover:border-white/50"
                    >
                      <BodySilhouette type={m.bodyType} className="h-4 w-10 shrink-0 [--glass:rgba(11,26,54,0.45)] [--rim:#8fa3c4] [--tire:#050b18]" />
                      {m.name}
                      <span className="rounded-full bg-black/25 px-2 text-xs">{m.n}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={href({ marca: brand.slug })}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  {total === 1 ? "Ver 1 vehículo" : `Ver ${total} vehículos`}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
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
