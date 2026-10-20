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
