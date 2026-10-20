import "server-only";
import * as icons from "simple-icons";
import { EXTRA_BRAND_LOGOS } from "@/lib/brand-logos-extra";

export type BrandLogo = { path: string; hex: string } | null;

const bySlug = new Map<string, { path: string; hex: string }>();
for (const icon of Object.values(icons)) {
  if (icon && typeof icon === "object" && "slug" in icon) bySlug.set(icon.slug, { path: icon.path, hex: icon.hex });
}
for (const [slug, logo] of Object.entries(EXTRA_BRAND_LOGOS)) bySlug.set(slug, logo);

/** Logo SVG (path 24x24) de simple-icons o de `EXTRA_BRAND_LOGOS`; `null` si la marca no está incluida (se usa monograma). */
export function getBrandLogo(iconSlug: string | null | undefined): BrandLogo {
  return iconSlug ? (bySlug.get(iconSlug) ?? null) : null;
}
