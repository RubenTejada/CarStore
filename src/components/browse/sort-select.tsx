"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  BadgePercent,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronDown,
  Clock,
  Gauge,
  History,
  type LucideIcon,
} from "lucide-react";
import { SORTS, type Sort } from "@/lib/search-params";
import { cn } from "@/lib/cn";

type Option = { key: Sort; icon: LucideIcon; label: string };

const GROUPS: { title: string; options: Option[] }[] = [
  {
    title: "Publicación",
    options: [
      { key: "recientes", icon: Clock, label: "Más recientes" },
      { key: "antiguos", icon: History, label: "Más antiguos" },
      { key: "rebajados", icon: BadgePercent, label: "Rebajados" },
    ],
  },
  {
    title: "Precio",
    options: [
      { key: "precio-asc", icon: ArrowUpNarrowWide, label: "Menor a mayor" },
      { key: "precio-desc", icon: ArrowDownWideNarrow, label: "Mayor a menor" },
    ],
  },
  {
    title: "Fabricación",
    options: [
      { key: "anio-desc", icon: CalendarArrowUp, label: "Más nuevo" },
      { key: "anio-asc", icon: CalendarArrowDown, label: "Más antiguo" },
    ],
  },
  {
    title: "Kilometraje",
    options: [{ key: "km-asc", icon: Gauge, label: "Menos km" }],
  },
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(key: Sort) {
    const next = new URLSearchParams(params);
    if (key === "recientes") next.delete("orden");
    else next.set("orden", key);
    next.delete("pagina");
    router.push(`${pathname}?${next}`, { scroll: false });
    setOpen(false);
  }

  const current = GROUPS.flatMap((g) => g.options).find((o) => o.key === value);
  const CurrentIcon = current?.icon ?? ArrowUpDown;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <CurrentIcon className="size-4" aria-hidden />
        <span className="opacity-70">Ordenar:</span>
        {current ? SORTS[current.key] : "Más recientes"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-4 rounded-xl border border-line bg-surface p-4 shadow-lg">
          {GROUPS.map((g) => (
            <div key={g.title} role="radiogroup" aria-label={g.title}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{g.title}</p>
              <div className="flex flex-wrap gap-2">
                {g.options.map(({ key, icon: Icon, label }) => {
                  const active = value === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      title={SORTS[key]}
                      onClick={() => select(key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        active
                          ? "border-brand bg-brand text-brand-ink"
                          : "border-line bg-surface text-muted hover:border-ink/30 hover:text-ink",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
