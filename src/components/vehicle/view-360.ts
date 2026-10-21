import { createContext } from "react";
import { getImageProps } from "next/image";

/** URL optimizada por next/image con el ancho más cercano por encima de `px` (o el mayor disponible). */
export function optimizedUrl(src: string, px: number) {
  const { srcSet, src: fallback } = getImageProps({ src, alt: "", fill: true, sizes: "100vw" }).props;
  const options = (srcSet ?? "").split(", ").flatMap((entry) => {
    const [url, w] = entry.split(" ");
    return url && w ? [{ url, w: parseInt(w) }] : [];
  });
  return (options.find((o) => o.w >= px) ?? options.at(-1))?.url ?? fallback;
}

/** Giro automático de las vistas 360 de una sección; un solo botón lo pausa para todas (WCAG 2.2.2). */
export const SpinPlaybackContext = createContext<{ playing: boolean; toggle: () => void; stop: () => void } | null>(null);
