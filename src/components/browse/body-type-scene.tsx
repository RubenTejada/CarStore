import type { ReactNode } from "react";
import type { BodyType } from "@/generated/prisma/enums";
import { BodySilhouette } from "./body-silhouette";

/**
 * Escenario animado de cada tipo en el buscador del inicio, acorde al uso del vehículo:
 * la jeepeta sube y baja montañas, el sedán va por la ciudad de noche, la camioneta arranca cargada,
 * el hatchback recorre el barrio, el coupé corre en pista, el convertible pasea frente al mar,
 * la minivan sale de viaje con maletas y la guagua se para a recoger un pasajero.
 *
 * Capas (todas con clases de globals.css):
 * - `back`/`front`: fijas (mar, sol, carretera, suelo…); aparecen al activar y animan su `--anim`.
 * - `items`: elementos sueltos que pasan detrás del carro (`scene-pass`); `over`, los que pasan por delante.
 * La animación arranca con hover/foco del botón padre (`.group`) o con `data-driving` al seleccionarlo.
 */
type Scene = { name: string; back?: string[]; items: string[]; front: string[]; over?: string[] };

const ROAD = "scene-road";

const SCENES: Record<BodyType, Scene> = {
  JEEPETA: {
    name: "mountain",
    items: ["scene-mountain", "scene-mountain scene-mountain-2", "scene-cloud", "scene-pine", "scene-pine scene-pine-2"],
    front: ["scene-terrain"],
  },
  SEDAN: {
    name: "city",
    back: ["scene-stars", "scene-stars scene-stars-2", "scene-moon"],
    items: ["scene-skyline", "scene-skyline scene-skyline-2", "scene-lamp", "scene-lamp scene-lamp-2"],
    front: [ROAD],
  },
  PICKUP: { name: "country", items: ["scene-hill", "scene-cloud", "scene-palm", "scene-palm scene-palm-2"], front: [ROAD] },
  HATCHBACK: {
    name: "barrio",
    items: ["scene-cloud", "scene-houses", "scene-houses scene-houses-2", "scene-pole"],
    front: [ROAD],
  },
  COUPE: {
    name: "track",
    items: ["scene-flag", "scene-streak", "scene-streak scene-streak-2", "scene-streak scene-streak-3"],
    front: ["scene-kerb"],
  },
  CONVERTIBLE: {
    name: "malecon",
    back: ["scene-sun", "scene-sea", "scene-glare"],
    items: ["scene-palm", "scene-palm scene-palm-2"],
    front: [ROAD],
    over: ["scene-palm scene-palm-front"],
  },
  MINIVAN: {
    name: "trip",
    items: ["scene-hill", "scene-cloud", "scene-sign", "scene-tree", "scene-tree scene-tree-2"],
    front: [ROAD],
  },
  VAN: { name: "bus", back: ["scene-busstop", "scene-rider"], items: ["scene-cloud"], front: ["scene-road scene-road-stopgo"] },
};

/**
 * Extras dentro de la silueta que se activan al arrancar: carga y luces
 * (coordenadas del viewBox de la silueta; se dibujan detrás de la carrocería).
 */
const EXTRAS: Partial<Record<BodyType, ReactNode>> = {
  // Faro encendido: haz de luz hacia la carretera desde el frente (x=115).
  SEDAN: (
    <g className="headlight">
      <defs>
        <linearGradient id="sedan-beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff3c4" stopOpacity={0.6} />
          <stop offset="1" stopColor="#fff3c4" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d="M114 26.5L168 22L168 40L114 31Z" fill="url(#sedan-beam)" />
      <ellipse cx={115.2} cy={28.6} rx={1.6} ry={1.3} fill="#fff3c4" />
    </g>
  ),
  // Cajas en el cajón (x=4 a x=50).
  PICKUP: (
    <g stroke="#0b1a36" strokeWidth={0.8}>
      <g className="cargo-box">
        <rect x={7} y={11} width={16} height={13} fill="#d9a45b" />
        <path d="M15 11v13" stroke="#f0d29a" strokeWidth={1.4} />
      </g>
      <g className="cargo-box [--d:0.12s]">
        <rect x={25} y={14} width={13} height={10} fill="#c48c45" />
        <path d="M25 18.5h13" stroke="#f0d29a" strokeWidth={1.2} />
      </g>
      <g className="cargo-box [--d:0.24s] [--hop:cargo-wobble]">
        <rect x={10} y={4} width={10} height={7} fill="#e2b46f" />
      </g>
    </g>
  ),
  // Parrilla en el techo (y=8) con maletas.
  MINIVAN: (
    <g>
      <path d="M14 6.5H70M20 6.5V8.5M64 6.5V8.5" stroke="#8fa3c4" strokeWidth={1.2} />
      <g stroke="#0b1a36" strokeWidth={0.8}>
        <g className="cargo-box">
          <rect x={18} y={0} width={20} height={6.5} rx={1} fill="#3b82c4" />
          <path d="M25 0V-1.5H31V0" fill="none" stroke="#c9d1de" />
        </g>
        <g className="cargo-box [--d:0.12s]">
          <rect x={40} y={1.5} width={14} height={5} rx={1} fill="#d0142c" />
        </g>
        <g className="cargo-box [--d:0.24s] [--hop:cargo-wobble]">
          <rect x={56} y={2.5} width={9} height={4} rx={1.5} fill="#e2b46f" />
        </g>
      </g>
    </g>
  ),
};

export function BodyTypeScene({ type }: { type: BodyType }) {
  const scene = SCENES[type];
  return (
    <span className="relative block h-20 w-full overflow-hidden rounded-lg" data-scene={scene.name} aria-hidden>
      {scene.back?.map((c) => (
        <span key={c} className={`scene-layer ${c}`} />
      ))}
      {scene.items.map((c) => (
        <span key={c} className={`scene-item ${c}`} />
      ))}
      {scene.front.map((c) => (
        <span key={c} className={`scene-layer ${c}`} />
      ))}
      <span className="scene-rig absolute bottom-[4px] left-1/2 -translate-x-1/2">
        <BodySilhouette
          type={type}
          className="scene-car block h-10 w-[100px] text-white sm:h-12 sm:w-[120px] [--glass:rgba(11,26,54,0.55)] [--rim:#8fa3c4] [--tire:#050b18]"
        >
          {EXTRAS[type]}
        </BodySilhouette>
      </span>
      {scene.over?.map((c) => (
        <span key={c} className={`scene-item ${c}`} />
      ))}
    </span>
  );
}
