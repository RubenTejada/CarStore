import { cn } from "@/lib/cn";

export type BrandMark = { name: string; color: string | null; logo: { path: string; hex: string } | null };

/**
 * Logo de marca: SVG de simple-icons cuando existe, si no un monograma.
 * `colored` pinta con el color de la marca; si no, usa el color de texto actual.
 */
export function BrandLogo({ brand, colored = false, className }: { brand: BrandMark; colored?: boolean; className?: string }) {
  const hex = brand.logo?.hex ?? brand.color ?? "0e1b33";
  // Colores casi negros se pierden en modo oscuro: usar currentColor.
  const dark = parseInt(hex.slice(0, 2), 16) + parseInt(hex.slice(2, 4), 16) + parseInt(hex.slice(4, 6), 16) < 120;
  const fill = colored && !dark ? `#${hex}` : "currentColor";

  if (brand.logo)
    return (
      <svg viewBox="0 0 24 24" role="img" aria-label={brand.name} className={cn("size-10", className)}>
        <path d={brand.logo.path} fill={fill} />
      </svg>
    );

  const initials = brand.name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={brand.name} className={cn("size-10", className)}>
      <circle cx="24" cy="24" r="21" fill="none" stroke={fill} strokeWidth="2.5" />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        style={{ fontStretch: "125%", fontWeight: 800, fontSize: initials.length > 2 ? 13 : 16, letterSpacing: "-0.02em" }}
      >
        {initials}
      </text>
    </svg>
  );
}

/** Cuadrícula de marcas compartida por la página de inicio y el buscador. */
export const brandGrid =
  "grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-surface text-ink sm:grid-cols-5 lg:grid-cols-8";
export const brandCell = "shadow-[0_0_0_0.5px_var(--line)]";
export const brandTile =
  "group flex h-full w-full flex-col items-center gap-3 px-2 py-6 text-center transition-colors hover:bg-surface-2";

/** `lively` suma la animación de hover del buscador: el logo salta y una barra subraya la marca. */
export function BrandTileBody({ brand, count, lively = false }: { brand: BrandMark; count: number; lively?: boolean }) {
  return (
    <>
      <BrandLogo
        brand={brand}
        colored
        className={cn(
          "size-14 text-ink opacity-70 grayscale sm:size-16 transition group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0",
          lively &&
            "duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:scale-115 motion-safe:group-hover:-rotate-6 motion-safe:group-focus-visible:-translate-y-1.5 motion-safe:group-focus-visible:scale-115",
        )}
      />
      <span className={cn("text-sm font-semibold", lively && "transition-colors group-hover:text-accent group-focus-visible:text-accent")}>{brand.name}</span>
      <span className="text-xs text-muted">{count === 1 ? "1 disponible" : count ? `${count} disponibles` : "Sin publicaciones"}</span>
      {lively && (
        <span
          aria-hidden
          className="absolute inset-x-5 bottom-0 h-0.5 scale-x-0 rounded-full bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
      )}
    </>
  );
}
