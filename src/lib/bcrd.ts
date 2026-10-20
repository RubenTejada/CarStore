import { inflateRawSync } from "node:zlib";

/**
 * Lectura de la tasa de referencia del dólar que publica el Banco Central (BCRD).
 *
 * El BCRD no tiene una API abierta (la suya exige credenciales y solicitud de acceso); lo que
 * sí publica a diario es un libro de Excel en su CDN con la serie desde 1991. Su hoja «Diaria»
 * trae, tras varias filas de encabezado combinadas, Año | Mes (en letras) | Día | Compra | Venta.
 * En vez de fijar la fila donde empiezan los datos se acepta cualquier fila con año, mes y día
 * reconocibles: si el BCRD agrega una fila de cabecera, el lector sigue funcionando.
 */
export const BCRD_USD_URL = "https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx";

export type BcrdRate = { date: string; buy: number; sell: number };

// El libro mezcla abreviaturas en español e inglés y a veces con espacios ("Jul ", "Aug").
const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/** Última tasa publicada en el libro (.xlsx); `null` si no trae ninguna legible. */
export function latestUsdRate(xlsx: Uint8Array): BcrdRate | null {
  const files = unzip(xlsx);
  const text = (name: string) => {
    const f = files.get(name);
    return f ? new TextDecoder().decode(f) : "";
  };
  const sheet = firstSheetPath(text("xl/workbook.xml"), text("xl/_rels/workbook.xml.rels"));
  return latestRateFromSheet(text(sheet), sharedStrings(text("xl/sharedStrings.xml")));
}

/** La fila más reciente con fecha válida y tasa de venta (o compra) positiva. */
export function latestRateFromSheet(sheetXml: string, strings: string[]): BcrdRate | null {
  let latest: BcrdRate | null = null;
  for (const [, row] of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = new Map<string, string>();
    for (const [, attrs, body] of row.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (col && body) cells.set(col, cellValue(attrs, body, strings));
    }
    const year = Number(cells.get("A"));
    const month = MONTHS[(cells.get("B") ?? "").trim().toLowerCase()];
    const day = Number(cells.get("C"));
    if (!Number.isInteger(year) || year < 1900 || !month || !Number.isInteger(day) || day < 1 || day > 31) continue;
    const buy = positive(cells.get("D"));
    const sell = positive(cells.get("E"));
    if (!buy && !sell) continue; // un día sin dato no es una tasa de cero
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!latest || date >= latest.date) latest = { date, buy: buy ?? sell!, sell: sell ?? buy! };
  }
  return latest;
}

export function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => [...si.matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join(""));
}

function cellValue(attrs: string, body: string, strings: string[]) {
  const type = /\bt="(\w+)"/.exec(attrs)?.[1];
  if (type === "inlineStr") return /<t\b[^>]*>([^<]*)<\/t>/.exec(body)?.[1] ?? "";
  const v = /<v>([^<]*)<\/v>/.exec(body)?.[1] ?? "";
  return type === "s" ? (strings[Number(v)] ?? "") : v;
}

function positive(value: string | undefined) {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Ruta de la primera hoja del libro (la «Diaria»), resuelta por sus relaciones. */
function firstSheetPath(workbookXml: string, relsXml: string) {
  const id = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbookXml)?.[1];
  const target = id && new RegExp(`<Relationship\\b[^>]*\\bId="${id}"[^>]*\\bTarget="([^"]+)"`).exec(relsXml)?.[1];
  const path = target || "worksheets/sheet1.xml";
  return path.startsWith("/") ? path.slice(1) : `xl/${path}`;
}

/**
 * Lector mínimo de ZIP (el formato del .xlsx): directorio central y entradas guardadas
 * o comprimidas con deflate. Suficiente para un libro de Excel; no maneja ZIP64 ni cifrado.
 */
export function unzip(data: Uint8Array): Map<string, Uint8Array> {
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("El archivo no es un ZIP válido.");
  const files = new Map<string, Uint8Array>();
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = buf.readUInt16LE(eocd + 10); n > 0; n--) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Directorio del ZIP dañado.");
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, inflateRawSync(raw));
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return files;
}
