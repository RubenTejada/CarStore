import Link from "next/link";
import { useId } from "react";
import { preload } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Silueta dinámica (propuesta 1). La máscara conserva el arte aprobado y permite
 * animar silueta, nombre y etiqueta por separado con colores adaptados al fondo.
 */
export function Logo({ className, inverted = false, intro = false }: { className?: string; inverted?: boolean; intro?: boolean }) {
  const maskId = `logo-silhouette-${useId().replace(/:/g, "")}`;
  const wordClipId = `${maskId}-tucarr`;
  if (intro) preload("/brand/tucarroonline-silhouette.png", { as: "image" });

  return (
    <Link href="/" className={cn("logo block w-44 shrink-0", intro && "logo-intro", className)} aria-label="TuCarroOnline, inicio">
      <svg viewBox="0 0 2206 713" width="2206" height="713" className="block h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={wordClipId}>
            {/* Sigue el espacio inclinado entre la última R y la O del arte original. */}
            <polygon points="0,340 1880,340 1846,400 1825,462 1800,520 1810,605 0,605" />
          </clipPath>
          <mask id={maskId} x="0" y="0" width="2206" height="713" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
            <image href="/brand/tucarroonline-silhouette.png" width="2206" height="713" />
          </mask>
        </defs>
        <g className="logo-silhouette" mask={`url(#${maskId})`}>
          <rect className={inverted ? "fill-[#ff4d63]" : "fill-accent"} width="2206" height="340" />
        </g>
        <g className="logo-word">
          <g mask={`url(#${maskId})`} clipPath={`url(#${wordClipId})`}>
            <rect className={inverted ? "fill-white" : "fill-ink"} y="340" width="2206" height="265" />
          </g>
          {/* La goma sustituye únicamente la O de CARRO y conserva la inclinación del nombre. */}
          <g transform="translate(1970 462) skewX(-17)" className={inverted ? "text-white" : "text-ink"}>
            <g className="logo-wheel-spin">
              <path fill="currentColor" fillRule="evenodd" d="M124 0a124 124 0 1 0-248 0a124 124 0 1 0 248 0ZM86 0a86 86 0 1 1-172 0a86 86 0 1 1 172 0Z" />
              <circle r="105" fill="none" stroke={inverted ? "#0b1a36" : "#ffffff"} strokeOpacity="0.45" strokeWidth="7" strokeDasharray="17 22" />
              <circle r="76" fill="none" stroke="currentColor" strokeWidth="10" />
              {[0, 72, 144, 216, 288].map((angle) => (
                <path key={angle} transform={`rotate(${angle})`} d="M-10-76H10L17-23L7-10H-7L-17-23Z" fill="currentColor" />
              ))}
              <circle r="23" className={inverted ? "fill-[#ff4d63]" : "fill-accent"} />
              <circle r="8" fill="currentColor" />
            </g>
          </g>
        </g>
        <g className="logo-tag">
          <g transform="translate(1103 648) scale(1.25) translate(-1103 -648)" mask={`url(#${maskId})`}>
            <rect className={inverted ? "fill-[#ff4d63]" : "fill-accent"} y="605" width="2206" height="108" />
          </g>
        </g>
      </svg>
    </Link>
  );
}
