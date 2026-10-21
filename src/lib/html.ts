/** Utilidades para leer páginas de terceros sin un parser de HTML (las tasas de bancos, anuncios de otros portales). */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodifica las entidades HTML habituales: numéricas, &amp; &lt; &nbsp;… y las vocales acentuadas y la eñe (&aacute;, &ntilde;). */
export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    const lower = code.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    // Vocales acentuadas y eñe, las más comunes en páginas en español.
    const accent = /^([aeiounc])(acute|tilde|uml|cedil)$/i.exec(code);
    if (accent) return (accent[1] + { acute: "́", tilde: "̃", uml: "̈", cedil: "̧" }[accent[2].toLowerCase() as "acute"]).normalize("NFC");
    if (lower === "iexcl") return "¡";
    if (lower === "iquest") return "¿";
    return m;
  });
}

/** Texto legible de una página: sin scripts, estilos ni etiquetas. */
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Contenido de los bloques JSON-LD (datos estructurados del anuncio, cuando el portal los publica). */
export function jsonLdBlocks(html: string) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim()).filter(Boolean);
}

/** Etiquetas <meta> de Open Graph y descripción. */
export function metaTags(html: string) {
  const out: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = /\b(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase();
    const content = /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1];
    if (key && content && (key.startsWith("og:") || key.startsWith("product:") || key === "description") && !(key in out)) out[key] = decodeEntities(content);
  }
  return out;
}

function absolute(href: string, base: string) {
  try {
    const url = new URL(decodeEntities(href.trim()).replace(/\\u002F/gi, "/"), base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** Enlaces de la página (URL absoluta y texto del enlace), sin repetir y en orden de aparición. */
export function pageLinks(html: string, base: string) {
  const links = new Map<string, string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(m[1], base);
    if (!url) continue;
    const text = htmlToText(m[2]).replace(/\s+/g, " ").slice(0, 120);
    if (!links.has(url) || (!links.get(url) && text)) links.set(url, text);
  }
  return [...links].map(([url, text]) => ({ url, text }));
}

const IMAGE_URL = /\.(jpe?g|png|webp|avif)(\?|$)/i;

/**
 * URLs de imágenes candidatas a fotos del anuncio: `src`/`srcset`/`data-*` de las etiquetas y
 * cualquier URL de imagen que aparezca en el HTML o en los datos JSON embebidos.
 */
export function pageImages(html: string, base: string) {
  const urls = new Set<string>();
  const add = (raw: string) => {
    const url = absolute(raw, base);
    if (url && !/\.svg(\?|$)/i.test(url) && !/(favicon|sprite|logo|icon|avatar|placeholder|blank)/i.test(url)) urls.add(url);
  };
  for (const m of html.matchAll(/<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi)) {
    const c = /\bcontent=["']([^"']+)["']/i.exec(m[0])?.[1];
    if (c) add(c);
  }
  for (const m of html.matchAll(/\b(?:src|data-src|data-original|data-lazy|data-zoom-image|data-full|href)=["']([^"']+)["']/gi)) if (IMAGE_URL.test(m[1])) add(m[1]);
  for (const m of html.matchAll(/\b(?:srcset|data-srcset)=["']([^"']+)["']/gi)) for (const part of m[1].split(",")) add(part.trim().split(/\s+/)[0]);
  for (const m of html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").matchAll(/https?:\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>()\\]*)?/gi)) add(m[0]);
  return [...urls];
}
