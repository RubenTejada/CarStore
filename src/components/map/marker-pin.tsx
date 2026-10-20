import type { ReactNode } from "react";

// Pin en forma de gota (viewBox 40×52): cabeza circular centrada en (20, 19), punta en (20, 50).
// Lo comparten los marcadores de Google Maps (HTML) y el mapa esquemático (SVG).
export const PIN_VIEW = { w: 40, h: 52, headY: 19, tipY: 50 };
export const PIN_PATH = "M20 50C14 41 4 31 4 19a16 16 0 1 1 32 0c0 12-10 22-16 31Z";

export const PIN_COLOR = { vehicle: "#d0142c", dealer: "#0b2a5b", me: "#f5b700" } as const;

/**
 * Marcador con punta. Su borde inferior es la punta, así que con el ancla por defecto de
 * AdvancedMarker (abajo al centro) señala exactamente la posición.
 */
export function MarkerPin({ color, width = 36, children }: { color: string; width?: number; children?: ReactNode }) {
  const height = (width * PIN_VIEW.h) / PIN_VIEW.w;
  return (
    <span className="relative block drop-shadow-[0_3px_4px_rgb(14_27_51/.45)]" style={{ width, height }}>
      <svg viewBox={`0 0 ${PIN_VIEW.w} ${PIN_VIEW.h}`} className="absolute inset-0 size-full" aria-hidden>
        <path d={PIN_PATH} fill={color} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-x-0 top-0 grid place-items-center" style={{ height: (width * PIN_VIEW.headY * 2) / PIN_VIEW.w }}>
        {children}
      </span>
    </span>
  );
}
