/* eslint-disable @next/next/no-img-element -- Satori solo entiende <img> */
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readUpload } from "@/lib/upload";
import { safeFetch } from "@/lib/safe-fetch";
import { FORMATS, adPhotos, coverCrop, type AdData, type AdDesign } from "./design";
import { designFonts } from "./fonts";
import { photoSlots, renderAd, type Box } from "./templates";

/** Lee una foto del vehículo o el logo del dealer: solo los orígenes que acepta el portal. */
async function loadSource(src: string): Promise<Buffer | null> {
  if (src.startsWith("/uploads/")) return readUpload(src.split("/").slice(2));
  if (/^\/demo-360\/[a-z]+\/(spin\/\d{2}|interior)\.webp$/.test(src)) return readFile(path.join(process.cwd(), "public", src)).catch(() => null);
  if (src.startsWith("https://images.unsplash.com/")) return safeFetch(src, { maxBytes: 15 * 1024 * 1024, accept: "image/*" }).then((r) => r.body, () => null);
  return null;
}

const dataUri = (buffer: Buffer, type: string) => `data:${type};base64,${buffer.toString("base64")}`;

/** Recorta la foto a la caja exacta con el mismo encuadre que la vista previa del navegador. */
async function cropPhoto(src: string, box: Box, zoom: number, fx: number, fy: number) {
  const buffer = await loadSource(src);
  if (!buffer) return null;
  const image = sharp(buffer).rotate();
  const { width, height } = (await sharp(buffer).metadata()).autoOrient;
  if (!width || !height) return null;
  const crop = coverCrop(width, height, box.w, box.h, zoom, fx, fy);
  const out = await image.extract(crop).resize(box.w, box.h, { fit: "fill" }).jpeg({ quality: 88 }).toBuffer();
  return dataUri(out, "image/jpeg");
}

async function fitLogo(src: string) {
  const buffer = await loadSource(src);
  if (!buffer) return null;
  const out = await sharp(buffer).rotate().resize(240, 240, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  return dataUri(out, "image/png");
}

const key = (src: string, box: Box, main: boolean) => `${main ? 1 : 0}|${box.w}x${box.h}|${src}`;

/** Genera el anuncio como JPEG (Instagram solo publica JPEG). */
export async function renderAdImage(design: AdDesign, data: AdData): Promise<Buffer> {
  const { width: W, height: H } = FORMATS[design.format];
  const slots = photoSlots(design, W, H);
  const photos = adPhotos(design, data, slots.length);

  const prepared = new Map<string, string>();
  const [logo, fonts] = await Promise.all([
    data.logoUrl && design.show.logo ? fitLogo(data.logoUrl).catch(() => null) : null,
    designFonts(design),
    ...photos.map(async (src, i) => {
      const main = i === 0;
      const uri = await cropPhoto(src, slots[i], main ? design.zoom : 1, main ? design.focusX : 50, main ? design.focusY : 50).catch(() => null);
      if (uri) prepared.set(key(src, slots[i], main), uri);
    }),
  ]);

  const element = renderAd(design, data, W, H, {
    logo,
    photo: (src, box, main) => {
      const uri = prepared.get(key(src, box, main));
      return uri ? <img src={uri} width={box.w} height={box.h} style={{ width: box.w, height: box.h }} alt="" /> : <div style={{ display: "flex", width: box.w, height: box.h }} />;
    },
  });
  const png = Buffer.from(await new ImageResponse(element, { width: W, height: H, fonts }).arrayBuffer());
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
