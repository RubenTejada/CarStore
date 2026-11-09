// Sin dependencias de Next: también lo usa scripts/social-metrics.ts.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Los tokens de Meta dan acceso a publicar en la página del dealer: se guardan cifrados (AES-256-GCM)
// con SOCIAL_TOKEN_KEY, 32 bytes en base64 (`openssl rand -base64 32`). Formato: v1.iv.tag.datos (base64url).

function key() {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("SOCIAL_TOKEN_KEY debe ser una clave de 32 bytes en base64.");
  return buf;
}

export const hasTokenKey = () => {
  try {
    key();
    return true;
  } catch {
    return false;
  }
};

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function openSecret(sealed: string): string {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Secreto con formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
