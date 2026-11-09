// Texto (pie) de la publicación. Se guarda con marcadores y se completa al publicar en cada red,
// así el enlace lleva su utm_source y el portal sabe de qué red llegó cada visita.
import { fillText, type AdData } from "./design";
import type { SocialNetwork } from "@/generated/prisma/enums";

export const DEFAULT_CAPTION = `🚗 {titulo} {año} {version}
💰 {precio}
📍 {provincia} · {km} · {transmision}

¿Te interesa? Escríbenos al {telefono}
Fotos y detalles: {enlace}

{hashtags}`;

/** Marcadores que entiende el editor, con su explicación. */
export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "titulo", label: "Marca y modelo" },
  { key: "año", label: "Año" },
  { key: "version", label: "Versión" },
  { key: "precio", label: "Precio" },
  { key: "km", label: "Kilometraje" },
  { key: "condicion", label: "Nuevo o usado" },
  { key: "transmision", label: "Transmisión" },
  { key: "combustible", label: "Combustible" },
  { key: "provincia", label: "Provincia" },
  { key: "dealer", label: "Nombre del dealer" },
  { key: "telefono", label: "Teléfono" },
  { key: "enlace", label: "Enlace al anuncio en el portal" },
  { key: "hashtags", label: "Hashtags automáticos" },
];

/** Instagram admite hasta 2,200 caracteres y 30 hashtags por publicación. */
export const CAPTION_MAX = 2200;

const tag = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");

export function hashtags(data: AdData) {
  const tags = [tag(data.brand), tag(`${data.brand}${data.model}`), tag(data.model), "CarrosRD", "VentaDeCarros", data.condition === "Nuevo" ? "CarrosNuevos" : "CarrosUsados", tag(data.province), tag(data.dealerName)];
  return [...new Set(tags.filter((t) => t.length > 1))].map((t) => `#${t}`).join(" ");
}

/** Enlace a la ficha con la red de origen, para contar las visitas que llegan desde cada publicación. */
export function socialLink(vehicleUrl: string, network: SocialNetwork) {
  const url = new URL(vehicleUrl);
  url.searchParams.set("utm_source", network.toLowerCase());
  url.searchParams.set("utm_medium", "social");
  return url.href;
}

export function fillCaption(template: string, data: AdData, link: string) {
  return fillText(template, data, { enlace: link, hashtags: hashtags(data) }).slice(0, CAPTION_MAX);
}

/** Red de una visita a partir de `utm_source`, o `null` si no viene de redes. */
export function visitNetwork(utmSource: unknown): SocialNetwork | null {
  const s = typeof utmSource === "string" ? utmSource.toLowerCase() : "";
  return s === "facebook" || s === "fb" ? "FACEBOOK" : s === "instagram" || s === "ig" ? "INSTAGRAM" : null;
}
