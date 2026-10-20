"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { OUTLINE_PATH, VIEW, project, unproject } from "./dr-outline";
import type { MapPoint } from "./types";

type Group = { key: string; x: number; y: number; points: MapPoint[] };

/**
 * Mapa esquemático de RD en SVG. Se usa cuando no hay clave de Google Maps
 * y como selector de ubicación aproximada (`onPick`).
 */
export function SchematicMap({
  points,
  className,
  onPick,
  picked,
  note = true,
}: {
  points: MapPoint[];
  className?: string;
  onPick?: (pos: { lat: number; lng: number }) => void;
  picked?: { lat: number; lng: number } | null;
  note?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);

  // Agrupa puntos cercanos (~2 km) en una sola burbuja.
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const p of points) {
      const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
      const g = map.get(key);
      if (g) g.points.push(p);
      else map.set(key, { key, ...project(p.lat, p.lng), points: [p] });
    }
    return [...map.values()];
  }, [points]);

  const active = groups.find((g) => g.key === open);
  const pickedXY = picked ? project(picked.lat, picked.lng) : null;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl bg-[#0e2a55]", className)}>
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className={cn("h-full w-full", onPick && "cursor-crosshair")}
        role="img"
        aria-label="Mapa de República Dominicana"
        onClick={(e) => {
          if (!onPick) return;
          const svg = e.currentTarget;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse());
          const pos = unproject(x, y);
          onPick({ lat: +pos.lat.toFixed(5), lng: +pos.lng.toFixed(5) });
        }}
      >
        <defs>
          <pattern id="sea" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.08)" />
          </pattern>
        </defs>
        <rect width={VIEW.w} height={VIEW.h} fill="url(#sea)" />
        <path d={OUTLINE_PATH} fill="#f3f5f8" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
        {groups.map((g) => {
          const dealer = g.points.some((p) => p.kind === "dealer");
          const n = g.points.length;
          const r = n > 1 ? Math.min(30, 13 + Math.sqrt(n) * 4) : 10;
          return (
            <g
              key={g.key}
              role="button"
              tabIndex={0}
              aria-label={`${n} ${n === 1 ? g.points[0].title : "resultados"} aquí`}
              className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[#d0142c]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(g.key === open ? null : g.key);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(g.key === open ? null : g.key);
                }
              }}
            >
              <circle cx={g.x} cy={g.y} r={r + 6} fill={dealer ? "rgba(11,42,91,0.18)" : "rgba(208,20,44,0.18)"} />
              <circle cx={g.x} cy={g.y} r={r} fill={dealer ? "#0b2a5b" : "#d0142c"} stroke="#fff" strokeWidth="3" />
              {n > 1 && (
                <text x={g.x} y={g.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="17" fontWeight="800">
                  {n}
                </text>
              )}
            </g>
          );
        })}
        {pickedXY && (
          <g pointerEvents="none">
            <circle cx={pickedXY.x} cy={pickedXY.y} r="16" fill="rgba(208,20,44,0.25)" />
            <circle cx={pickedXY.x} cy={pickedXY.y} r="8" fill="#d0142c" stroke="#fff" strokeWidth="3" />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="absolute z-10 w-72 max-w-[calc(100%-1rem)] rounded-xl bg-white p-2 text-[#0e1b33] shadow-2xl"
          style={{
            left: `clamp(0.5rem, calc(${(active.x / VIEW.w) * 100}% - 9rem), calc(100% - 18.5rem))`,
            top: active.y / VIEW.h > 0.55 ? undefined : `calc(${(active.y / VIEW.h) * 100}% + 1.5rem)`,
            bottom: active.y / VIEW.h > 0.55 ? `calc(${(1 - active.y / VIEW.h) * 100}% + 1.5rem)` : undefined,
          }}
        >
          <button type="button" onClick={() => setOpen(null)} className="absolute top-1 right-1 rounded-md p-1 hover:bg-black/5" aria-label="Cerrar">
            <X className="size-4" aria-hidden />
          </button>
          <ul className="max-h-64 overflow-auto">
            {active.points.slice(0, 12).map((p) => (
              <li key={p.id}>
                <MapPointLink p={p} />
              </li>
            ))}
          </ul>
          {active.points.length > 12 && <p className="px-2 pt-1 text-xs text-[#566176]">y {active.points.length - 12} más</p>}
        </div>
      )}

      {note && !onPick && (
        <p className="absolute right-2 bottom-2 left-2 rounded-lg bg-black/35 px-3 py-1.5 text-xs text-white/85 backdrop-blur-sm sm:right-auto">
          Vista esquemática. Configura la clave de Google Maps para ver el mapa detallado.
        </p>
      )}
    </div>
  );
}

export function MapPointLink({ p }: { p: MapPoint }) {
  return (
    <Link href={p.href} className="flex items-center gap-3 rounded-lg p-2 pr-6 hover:bg-[#eef1f5]">
      {p.image ? (
        <Image src={p.image} alt="" width={64} height={44} className="h-11 w-16 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="grid h-11 w-16 shrink-0 place-items-center rounded-md bg-[#0b2a5b] text-xs font-bold text-white">Dealer</span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{p.title}</span>
        {p.subtitle && <span className="block truncate text-xs text-[#566176]">{p.subtitle}</span>}
      </span>
    </Link>
  );
}
