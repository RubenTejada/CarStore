// Diseño del anuncio para redes sociales: lo que el dealer ajusta en el editor (plantilla, fotos,
// textos, tipografía, colores y formato). Se guarda como JSON (SocialAd.design y el diseño por
// defecto del dealer en SocialAccount.defaultDesign) y lo usan por igual la vista previa del navegador
// y la imagen final que genera el servidor (src/lib/social/render.tsx), así lo que se ve es lo que se publica.
import { z } from "zod";

export const FORMATS = {
  square: { label: "Cuadrado 1:1", hint: "Feed de Facebook e Instagram", width: 1080, height: 1080 },
  portrait: { label: "Vertical 4:5", hint: "Ocupa más pantalla en el feed", width: 1080, height: 1350 },
  story: { label: "Historia 9:16", hint: "Historias de Instagram y Facebook", width: 1080, height: 1920 },
} as const;
export type FormatId = keyof typeof FORMATS;

/** Fuentes disponibles; los archivos son de @fontsource (ver src/lib/social/fonts.ts). `body`: también sirve para el texto corrido (pesos 500 y 700). */
export const FONTS = {
  montserrat: { label: "Montserrat", family: "Montserrat", heading: 800, body: true },
  poppins: { label: "Poppins", family: "Poppins", heading: 800, body: true },
  archivo: { label: "Archivo", family: "Archivo", heading: 800, body: true },
  inter: { label: "Inter", family: "Inter", heading: 800, body: true },
  barlow: { label: "Barlow Condensed", family: "Barlow Condensed", heading: 800, body: true },
  oswald: { label: "Oswald", family: "Oswald", heading: 700, body: false },
  bebas: { label: "Bebas Neue", family: "Bebas Neue", heading: 400, body: false },
  anton: { label: "Anton", family: "Anton", heading: 400, body: false },
  playfair: { label: "Playfair Display", family: "Playfair Display", heading: 800, body: false },
} as const;
export type FontId = keyof typeof FONTS;
export const BODY_FONTS = (Object.keys(FONTS) as FontId[]).filter((id) => FONTS[id].body);

export type Palette = { bg: string; accent: string; text: string; accentText: string };

/** Combinaciones de colores probadas: fondo, color de acento (precio, cintas), texto sobre el fondo y texto sobre el acento. */
export const PALETTES: { id: string; label: string; colors: Palette }[] = [
  { id: "noche", label: "Noche y sol", colors: { bg: "#0b1020", accent: "#ffc531", text: "#ffffff", accentText: "#0b1020" } },
  { id: "deportivo", label: "Rojo deportivo", colors: { bg: "#111111", accent: "#e11d2e", text: "#ffffff", accentText: "#ffffff" } },
  { id: "lujo", label: "Negro y oro", colors: { bg: "#0a0a0a", accent: "#c9a14a", text: "#f5efe1", accentText: "#0a0a0a" } },
  { id: "oceano", label: "Océano", colors: { bg: "#0c2a4a", accent: "#22c3e6", text: "#ffffff", accentText: "#06243f" } },
  { id: "limpio", label: "Blanco limpio", colors: { bg: "#ffffff", accent: "#1d4ed8", text: "#0f172a", accentText: "#ffffff" } },
  { id: "crema", label: "Crema clásico", colors: { bg: "#f4ede1", accent: "#9a3412", text: "#1c1917", accentText: "#ffffff" } },
  { id: "selva", label: "Verde selva", colors: { bg: "#0f2e1f", accent: "#a3e635", text: "#f0fdf4", accentText: "#0f2e1f" } },
  { id: "atardecer", label: "Atardecer", colors: { bg: "#2a0f2e", accent: "#ff7a1a", text: "#ffffff", accentText: "#1d0820" } },
  { id: "electrico", label: "Eléctrico", colors: { bg: "#1e1b4b", accent: "#a78bfa", text: "#ffffff", accentText: "#1e1b4b" } },
  { id: "grafito", label: "Grafito y menta", colors: { bg: "#1f2937", accent: "#34d399", text: "#f9fafb", accentText: "#052e1d" } },
];

export const TEMPLATE_IDS = ["clasico", "banda", "etiqueta", "dividido", "revista", "collage", "minimal", "oferta"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text = (max: number) => z.string().max(max);
const pct = z.number().min(0).max(100);

export const designSchema = z.object({
  template: z.enum(TEMPLATE_IDS),
  format: z.enum(Object.keys(FORMATS) as [FormatId, ...FormatId[]]),
  // Fotos del anuncio en el orden en que las usa la plantilla (la primera es la principal).
  photos: z.array(z.string().max(500)).max(4),
  // Encuadre de la foto principal: zoom y punto que queda fijo (en % del ancho y alto).
  zoom: z.number().min(1).max(3),
  focusX: pct,
  focusY: pct,
  headline: text(80),
  subheadline: text(80),
  badge: text(30),
  cta: text(60),
  show: z.object({
    price: z.boolean(),
    priceBefore: z.boolean(),
    specs: z.boolean(),
    logo: z.boolean(),
    badge: z.boolean(),
    cta: z.boolean(),
    contact: z.boolean(),
    financing: z.boolean(),
  }),
  headingFont: z.enum(Object.keys(FONTS) as [FontId, ...FontId[]]),
  bodyFont: z.enum(Object.keys(FONTS) as [FontId, ...FontId[]]).refine((f) => FONTS[f].body, "Fuente de texto inválida"),
  uppercase: z.boolean(),
  textScale: z.number().min(0.7).max(1.4),
  align: z.enum(["left", "center"]),
  colors: z.object({ bg: hex, accent: hex, text: hex, accentText: hex }),
  // Oscurece la foto bajo el texto (0 = sin velo).
  overlay: z.number().min(0).max(95),
});
export type AdDesign = z.infer<typeof designSchema>;

/** Datos del vehículo ya formateados para pintar el anuncio (plantillas sin acceso a la base de datos). */
export type AdData = {
  brand: string;
  model: string;
  title: string; // "Toyota RAV4"
  year: number;
  trim: string | null;
  price: string; // "RD$1,850,000"
  priceBefore: string | null;
  mileage: string; // "45,000 km" o "0 km"
  condition: string; // "Usado"
  transmission: string;
  fuel: string;
  province: string;
  dealerName: string;
  logoUrl: string | null;
  phone: string | null;
  photos: string[]; // todas las fotos del vehículo
};

export const DEFAULT_DESIGN: AdDesign = {
  template: "clasico",
  format: "square",
  photos: [],
  zoom: 1,
  focusX: 50,
  focusY: 50,
  headline: "{titulo} {año}",
  subheadline: "{version}",
  badge: "Recién llegado",
  cta: "Escríbenos por WhatsApp",
  show: { price: true, priceBefore: true, specs: true, logo: true, badge: true, cta: true, contact: true, financing: false },
  headingFont: "montserrat",
  bodyFont: "inter",
  uppercase: false,
  textScale: 1,
  align: "left",
  colors: PALETTES[0].colors,
  overlay: 60,
};

/**
 * Diseño válido a partir de lo guardado: completa los campos que falten con los de `base`
 * (diseños de versiones anteriores, JSON dañado) en lugar de fallar.
 */
export function parseDesign(raw: unknown, base: AdDesign = DEFAULT_DESIGN): AdDesign {
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AdDesign>;
  const merged = { ...base, ...r, show: { ...base.show, ...(r.show ?? {}) }, colors: { ...base.colors, ...(r.colors ?? {}) } };
  const parsed = designSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  // Descarta campo por campo lo inválido.
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof AdDesign)[]) {
    const field = designSchema.shape[key].safeParse(merged[key]);
    if (field.success) out[key] = field.data;
  }
  return out as AdDesign;
}

/** Textos con marcadores ({titulo}, {año}, {precio}…) reemplazados por los datos del vehículo. */
export function fillText(template: string, data: AdData, extra: Record<string, string> = {}): string {
  const values: Record<string, string> = {
    titulo: data.title,
    año: String(data.year),
    version: data.trim ?? "",
    precio: data.price,
    km: data.mileage,
    condicion: data.condition,
    transmision: data.transmission,
    combustible: data.fuel,
    provincia: data.province,
    dealer: data.dealerName,
    telefono: data.phone ?? "",
    marca: data.brand,
    modelo: data.model,
    ...extra,
  };
  const value = (key: string) => values[key.toLowerCase()];
  return template
    .split("\n")
    // Una línea cuyos marcadores quedan todos vacíos («Escríbenos al {telefono}» sin teléfono) se omite.
    .filter((line) => {
      const keys = [...line.matchAll(/\{(\p{L}+)\}/gu)].map((m) => m[1]).filter((k) => value(k) !== undefined);
      return !keys.length || keys.some((k) => value(k));
    })
    .map((line) => line.replace(/\{(\p{L}+)\}/gu, (m, key: string) => value(key) ?? m).replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Fotos que pinta la plantilla: las elegidas que aún existen en el vehículo, completadas con las demás en orden. */
export function adPhotos(design: AdDesign, data: AdData, count: number): string[] {
  const chosen = design.photos.filter((p) => data.photos.includes(p));
  const rest = data.photos.filter((p) => !chosen.includes(p));
  return [...chosen, ...rest].slice(0, count);
}

/**
 * Recorte de una foto de `w`×`h` para llenar una caja de `W`×`H` (como object-fit: cover) con zoom y
 * punto fijo en `fx`,`fy` (0–100). Lo usa el servidor para recortar con sharp; el navegador logra lo mismo
 * con object-position y transform-origin en ese punto.
 */
export function coverCrop(w: number, h: number, W: number, H: number, zoom: number, fx: number, fy: number) {
  const scale = Math.max(W / w, H / h) * zoom;
  const cropW = Math.min(w, W / scale);
  const cropH = Math.min(h, H / scale);
  return {
    left: Math.round((w - cropW) * (fx / 100)),
    top: Math.round((h - cropH) * (fy / 100)),
    width: Math.max(1, Math.round(cropW)),
    height: Math.max(1, Math.round(cropH)),
  };
}

/** Color de texto legible (negro o blanco) sobre un fondo `hex`. */
export function readableOn(hexColor: string) {
  const n = parseInt(hexColor.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
}

/** `#rrggbb` con transparencia (`rgba`), para velos y degradados. */
export function alpha(hexColor: string, a: number) {
  const n = parseInt(hexColor.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
}
