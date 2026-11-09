import { siteUrl } from "@/lib/seo";

/**
 * Dominio propio de un dealer en forma canónica: minúsculas, sin protocolo, puerto, ruta ni "www.".
 * Acepta lo que un admin pegaría ("https://www.AutosPerez.com.do/") y devuelve null si no es un dominio.
 */
export function normalizeDomain(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  if (host.length > 253) return null;
  const labels = host.split(".");
  if (labels.length < 2 || !/^[a-z]{2,63}$/.test(labels.at(-1)!)) return null;
  return labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) ? host : null;
}

/** Dominio del portal, con el que nunca puede coincidir el dominio de un dealer. */
export const portalDomain = () => normalizeDomain(siteUrl())!;

/**
 * Dominio propio al que llegó la petición, o null si es el portal: el dominio de SITE_URL,
 * localhost o una IP (desarrollo y sondas del alojamiento).
 */
export function officialDomainOf(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.toLowerCase().replace(/:\d+$/, "");
  if (host === "localhost" || host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  const domain = normalizeDomain(host);
  return domain && domain !== portalDomain() ? domain : null;
}
