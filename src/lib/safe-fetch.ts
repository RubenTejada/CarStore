import "server-only";
import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

/**
 * GET de una URL que escribe el usuario (anuncios de otros portales y sus fotos). Como la petición
 * sale del servidor, no puede llegar a la red interna: solo http(s) en los puertos estándar y cada
 * dirección IP se valida al conectar (también en cada redirección), así un nombre que resuelve a
 * una IP privada o un redireccionamiento hacia `localhost` se rechazan.
 */

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_REDIRECTS = 5;

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(net, prefix, "ipv4");
// Las IPv4 mapeadas en IPv6 (::ffff:127.0.0.1) las cubren las reglas IPv4: BlockList las compara así.
for (const [net, prefix] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  blocked.addSubnet(net, prefix, "ipv6");

export function isPublicAddress(ip: string) {
  const family = isIP(ip);
  if (!family) return false;
  return !blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

export class FetchError extends Error {}

/** Valida que la URL sea http(s) pública y la devuelve normalizada. */
export function parsePublicUrl(raw: string | URL) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError("El enlace no es una URL válida.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError("El enlace debe empezar con http:// o https://.");
  if (url.username || url.password) throw new FetchError("El enlace no puede incluir usuario ni contraseña.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchError("El enlace usa un puerto no permitido.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) ? !isPublicAddress(host) : !host.includes(".") || host.endsWith(".local") || host.endsWith(".internal"))
    throw new FetchError("El enlace no apunta a un sitio público.");
  url.hash = "";
  return url;
}

// Resuelve el nombre y rechaza la conexión si alguna dirección es privada (sin carrera entre validar y conectar).
const safeLookup: typeof lookup = ((hostname: string, options: object, callback: (...args: unknown[]) => void) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as { address: string; family: number }[];
    if (!list.length || list.some((a) => !isPublicAddress(a.address))) return callback(new FetchError(`${hostname} no es un sitio público.`));
    if ((options as { all?: boolean }).all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}) as typeof lookup;

export type FetchedDocument = { url: string; contentType: string; body: Buffer };

/** Descarga `raw` siguiendo redirecciones; falla si la respuesta no es 2xx o supera `maxBytes`. */
export async function safeFetch(raw: string | URL, { maxBytes, timeoutMs = 20_000, accept = "*/*" }: { maxBytes: number; timeoutMs?: number; accept?: string }): Promise<FetchedDocument> {
  let url = parsePublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await request(url, { maxBytes, timeoutMs, accept });
    if (res.location) {
      url = parsePublicUrl(new URL(res.location, url));
      continue;
    }
    return { url: url.href, contentType: res.contentType, body: res.body };
  }
  throw new FetchError("Demasiadas redirecciones.");
}

function request(url: URL, { maxBytes, timeoutMs, accept }: { maxBytes: number; timeoutMs: number; accept: string }) {
  return new Promise<{ location?: string; contentType: string; body: Buffer }>((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      { lookup: safeLookup, headers: { "user-agent": USER_AGENT, accept, "accept-language": "es-DO,es;q=0.9" }, timeout: timeoutMs },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ location: res.headers.location, contentType: "", body: Buffer.alloc(0) });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(new FetchError(`${url.hostname} respondió ${status}.`));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new FetchError(`El archivo de ${url.hostname} es demasiado grande.`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ contentType: String(res.headers["content-type"] ?? ""), body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new FetchError(`${url.hostname} no respondió a tiempo.`)));
    req.on("error", (e) => reject(e instanceof FetchError ? e : new FetchError(`No se pudo abrir ${url.hostname}: ${e.message}`)));
  });
}
