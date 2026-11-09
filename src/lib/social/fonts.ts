import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FONTS, type AdDesign, type FontId } from "./design";

// Archivos .woff de @fontsource (Satori no lee woff2). next.config.ts los incluye en la salida standalone.
const PACKAGE: Record<FontId, string> = {
  montserrat: "montserrat",
  poppins: "poppins",
  archivo: "archivo",
  inter: "inter",
  barlow: "barlow-condensed",
  oswald: "oswald",
  bebas: "bebas-neue",
  anton: "anton",
  playfair: "playfair-display",
};

const cache = new Map<string, Promise<Buffer>>();

function load(id: FontId, weight: number) {
  const pkg = PACKAGE[id];
  const key = `${pkg}-${weight}`;
  let file = cache.get(key);
  if (!file) {
    file = readFile(path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", `${pkg}-latin-${weight}-normal.woff`));
    file.catch(() => cache.delete(key));
    cache.set(key, file);
  }
  return file;
}

/** Las fuentes que usa el diseño, en el formato de `ImageResponse`. */
export async function designFonts(d: AdDesign) {
  const wanted: [FontId, number][] = [
    [d.headingFont, FONTS[d.headingFont].heading],
    [d.bodyFont, 500],
    [d.bodyFont, 700],
  ];
  const unique = wanted.filter(([id, w], i) => wanted.findIndex(([id2, w2]) => id2 === id && w2 === w) === i);
  return Promise.all(
    unique.map(async ([id, weight]) => ({ name: FONTS[id].family, data: await load(id, weight), weight: weight as 400 | 500 | 700 | 800, style: "normal" as const })),
  );
}
