import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Almacenamiento local en disco (fase 2: S3/R2).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif", "avif"]);

/** Valida la imagen, la redimensiona a WebP y devuelve su URL pública (/uploads/...). */
export async function saveImage(file: File, kind: "vehicle" | "logo" | "cover"): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("La imagen supera 10 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buffer).metadata().catch(() => null);
  if (!meta?.format || !ALLOWED.has(meta.format)) throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");

  const size = kind === "logo" ? { width: 400, height: 400, fit: "inside" as const } : { width: kind === "cover" ? 2000 : 1600, withoutEnlargement: true };
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
