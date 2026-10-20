"use client";

import { useState } from "react";
import type { Histogram } from "@/lib/histogram";
import { cn } from "@/lib/cn";
import { label } from "@/components/ui/styles";

/**
 * Filtro de rango con histograma: dos manijas sobre las barras, que muestran
 * cuántos vehículos hay en cada tramo (respetando los demás filtros).
 *
 * Las manijas se mueven por los bordes de las barras (0…n). Un extremo al tope
 * no filtra: en la URL queda vacío. El valor de la URL viaja en inputs ocultos
 * y solo cambia si el usuario mueve esa manija, para no alterar valores que no
 * caen justo en un borde. Se aplica al soltar (`onCommit`), no en cada paso.
 *
 * `discrete`: cada barra es un único valor entero (años), así que el máximo es
 * inclusivo: la barra de 2020 llega hasta 2020, no hasta 2021.
 */
export function RangeHistogram({
  legend,
  names: [minName, maxName],
  histogram,
  value,
  discrete = false,
  format,
  onCommit,
}: {
  legend: string;
  names: [string, string];
  histogram: Histogram | null;
  value: [string | undefined, string | undefined];
  discrete?: boolean;
  format: (n: number) => string;
  onCommit: () => void;
}) {
  const [min, setMin] = useState(value[0] ?? "");
  const [max, setMax] = useState(value[1] ?? "");
  const hidden = (
    <>
      <input type="hidden" name={minName} value={min} />
      <input type="hidden" name={maxName} value={max} />
    </>
  );

  if (!histogram) {
    return (
      <fieldset>
        <legend className={label}>{legend}</legend>
        {hidden}
        <p className="text-sm text-muted">Sin vehículos para este rango.</p>
      </fieldset>
    );
  }

  const { start, step, counts } = histogram;
  const n = counts.length;
  const adjust = discrete ? 1 : 0;
  const at = (edge: number) => start + edge * step;
  const clampEdge = (x: number) => Math.min(n, Math.max(0, Math.round(x)));

  const lo = min ? clampEdge((Number(min) - start) / step) : 0;
  const hi = max ? clampEdge((Number(max) + adjust - start) / step) : n;
  const a = Math.min(lo, n - 1);
  const b = Math.max(hi, a + 1);
  const peak = Math.max(...counts, 1);

  const minText = format(at(a));
  const maxText = format(at(b) - adjust) + (b === n && !discrete ? "+" : "");
  const commit = () => {
    if (min !== (value[0] ?? "") || max !== (value[1] ?? "")) onCommit();
  };
  const thumbProps = { min: 0, max: n, step: 1, onPointerUp: commit, onKeyUp: commit, className: "dual-range" } as const;

  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      {hidden}
      <p className="mb-3 text-[15px] font-bold tabular-nums" aria-hidden>
        {minText} – {maxText}
      </p>

      {/* Las barras van con el mismo margen que el radio de la manija, para que cada borde coincida con su posición. */}
      <div className="flex h-16 items-end gap-px px-2.5" aria-hidden>
        {counts.map((c, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-t-sm transition-colors", i >= a && i < b ? "bg-brand/35" : "bg-surface-2")}
            style={{ height: c ? `max(3px, ${(c / peak) * 100}%)` : 0 }}
          />
        ))}
      </div>

      <div className="relative h-5">
        <div className="absolute inset-x-2.5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `calc(10px + ${(a / n) * 100}% - ${(a / n) * 20}px)`, right: `calc(10px + ${((n - b) / n) * 100}% - ${((n - b) / n) * 20}px)` }}
        />
        <input
          type="range"
          {...thumbProps}
          value={a}
          aria-label={`${legend}: mínimo`}
          aria-valuetext={a === 0 ? `Desde ${minText}, sin mínimo` : `Desde ${minText}`}
          // Con las manijas juntas a la derecha, la del mínimo queda encima para poder moverla.
          style={{ zIndex: a > n / 2 ? 2 : 1 }}
          onChange={(e) => {
            const edge = Math.min(Number(e.target.value), b - 1);
            setMin(edge === 0 ? "" : String(at(edge)));
          }}
        />
        <input
          type="range"
          {...thumbProps}
          value={b}
          aria-label={`${legend}: máximo`}
          aria-valuetext={b === n ? `Hasta ${maxText}, sin máximo` : `Hasta ${maxText}`}
          onChange={(e) => {
            const edge = Math.max(Number(e.target.value), a + 1);
            setMax(edge === n ? "" : String(at(edge) - adjust));
          }}
        />
      </div>
    </fieldset>
  );
}
