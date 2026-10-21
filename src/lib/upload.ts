import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Almacenamiento local en disco (fase 2: S3/R2).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024;
// Las cámaras 360 entregan panoramas grandes (5760×2880 o más).
const MAX_PANO_BYTES = 30 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export type UploadKind = "vehicle" | "logo" | "cover" | "pano";

/**
 * Valida la imagen, la redimensiona a WebP y devuelve su URL pública (/uploads/...).
 * `pano` es el interior 360: una foto equirectangular (proporción 2:1), hasta 4096 px de ancho.
 */
export async function saveImage(file: File, kind: UploadKind): Promise<string> {
  const maxBytes = kind === "pano" ? MAX_PANO_BYTES : MAX_BYTES;
  if (file.size > maxBytes) throw new Error(`La imagen supera ${maxBytes / 1024 / 1024} MB.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buffer).metadata().catch(() => null);
  if (!meta?.format || !ALLOWED.has(meta.format)) throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
  if (kind === "pano") {
    const { width, height } = meta.autoOrient;
    if (Math.abs(width / height - 2) > 0.02) throw new Error("La vista del interior debe ser una foto 360 equirectangular (proporción 2:1).");
  }

  const size =
    kind === "logo"
      ? { width: 400, height: 400, fit: "inside" as const }
      : { width: kind === "pano" ? 4096 : kind === "cover" ? 2000 : 1600, withoutEnlargement: true };
  const output = await sharp(buffer).rotate().resize(size).webp({ quality: 82 }).toBuffer();

  const month = new Date().toISOString().slice(0, 7);
  const name = `${randomBytes(12).toString("hex")}.webp`;
  await mkdir(path.join(UPLOAD_DIR, month), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, month, name), output);
  return `/uploads/${month}/${name}`;
}

/** Lee un archivo subido; `null` si la ruta no es válida. */
export async function readUpload(segments: string[]) {
  if (segments.length !== 2 || !/^\d{4}-\d{2}$/.test(segments[0]) || !/^[a-f0-9]{24}\.webp$/.test(segments[1])) return null;
  return readFile(path.join(UPLOAD_DIR, segments[0], segments[1])).catch(() => null);
}
