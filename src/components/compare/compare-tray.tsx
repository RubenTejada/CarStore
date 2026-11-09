"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Trash2, X } from "lucide-react";
import { MAX_COMPARE, compareUrl } from "@/lib/compare";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { useCompare } from "./use-compare";

/** Bandeja flotante con la selección del comparador; se oculta dentro de /comparar. */
export function CompareTray() {
  const { items, remove, replace } = useCompare();
  const pathname = usePathname();
  if (!items.length || pathname === "/comparar") return null;
  const ready = items.length >= 2;

  return (
    <>
      <div aria-hidden className="h-24" />
      <section aria-label="Comparador" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
        {/* Colores invertidos respecto al tema (ink ↔ surface) para que destaque en claro y en oscuro. */}
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-ink p-2.5 text-surface shadow-[0_18px_44px_-10px_rgba(11,26,54,0.6)] ring-1 ring-ink/20">
          <ul className="flex gap-2">
            {Array.from({ length: MAX_COMPARE }, (_, i) => items[i]).map((item, i) =>
              item ? (
                <li key={item.id} className="relative">
                  <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-surface/15 ring-2 ring-surface/80 sm:w-20" title={`${item.title} ${item.year}`}>
                    {item.photo && <Image src={item.photo} alt="" fill sizes="80px" className="object-cover" />}
                    <span className="absolute inset-x-0 bottom-0 bg-night/70 px-1 text-center text-[10px] font-bold text-white">{item.year}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-ink shadow"
                    aria-label={`Quitar ${item.title} ${item.year} del comparador`}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ) : (
                <li key={`empty-${i}`} aria-hidden className="h-12 w-16 rounded-lg border-2 border-dashed border-surface/35 sm:w-20" />
              ),
            )}
          </ul>
          <p className="hidden min-w-0 flex-1 text-sm sm:block">
            <span className="font-bold">
              {items.length} de {MAX_COMPARE} vehículos
            </span>
            <span className="block truncate text-surface/70">{ready ? items.map((i) => i.title).join(" vs ") : "Elige otro para comparar"}</span>
          </p>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => replace([])} className={cn(button("ghost", "sm"), "text-surface hover:bg-surface/15")} aria-label="Vaciar comparador">
              <Trash2 className="size-4" aria-hidden />
            </button>
            {ready ? (
              <Link href={compareUrl(items.map((i) => i.id))} className={button("primary", "sm")}>
                <Scale className="size-4" aria-hidden />
                Comparar
              </Link>
            ) : (
              <span className={cn(button("outline", "sm"), "pointer-events-none border-surface/35 bg-transparent text-surface/80")}>Elige 1 más</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
