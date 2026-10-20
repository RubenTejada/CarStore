import Link from "next/link";
import { cn } from "@/lib/cn";
import { BrandMark } from "./brand-mark";

/**
 * Logo de TuCarroOnline: monograma TC con líneas de velocidad + nombre en Saira itálica.
 * `intro` reproduce la animación de entrada al cargar (solo en el header); el hover anima siempre.
 */
export function Logo({ className, inverted = false, intro = false }: { className?: string; inverted?: boolean; intro?: boolean }) {
  return (
    <Link href="/" className={cn("logo flex shrink-0 items-center gap-2", intro && "logo-intro", className)} aria-label="TuCarroOnline, inicio">
      <BrandMark className={cn("h-8 w-auto overflow-visible", inverted ? "text-white" : "text-ink")} />
      <span className="flex flex-col items-end font-logo leading-none italic" aria-hidden>
        <span className={cn("logo-word text-[1.6rem] leading-[0.85] font-extrabold tracking-[-0.01em]", inverted ? "text-white" : "text-ink")}>TUCARRO</span>
        {/* El margen negativo compensa el espaciado tras la última letra para que quede al ras derecho. */}
        <span className={cn("logo-tag mt-[3px] -mr-[0.62em] text-[0.56rem] font-semibold tracking-[0.62em]", inverted ? "text-[#ff4d63]" : "text-accent")}>ONLINE</span>
      </span>
    </Link>
  );
}
