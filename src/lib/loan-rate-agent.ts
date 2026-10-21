import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { htmlToText } from "@/lib/html";
import { CLAUDE_MODEL, refusalFallback, type ClaudeClient } from "@/lib/claude";
import type { Lender, RateSource } from "@/lib/lenders";

/**
 * Lectura diaria de las tasas de préstamos de vehículos que cada entidad publica en su sitio
 * (un PDF de «tasas de referencia» o «tarifario», o una página). Cada documento tiene su propio
 * formato, y algunos PDF son imágenes, así que la extracción la hace Claude con salida
 * estructurada; aquí se validan los valores antes de publicarlos. Sin dependencias de Next:
 * lo ejecuta `scripts/update-rates.ts` desde GitHub Actions.
 */

// Algunos CDN de bancos rechazan clientes sin agente de navegador.
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_TEXT_CHARS = 150_000;

export type SourceDocument = { url: string; kind: "pdf" | "html"; body: Buffer };

const Extraction = z.object({
  effectiveDate: z
    .string()
    .nullable()
    .describe("Fecha de vigencia o de última modificación impresa en el documento, en formato YYYY-MM-DD; null si no aparece."),
  rates: z.array(
    z.object({
      condition: z.enum(["NEW", "USED"]).describe("NEW: vehículos nuevos / 0 km. USED: usados o seminuevos."),
      rate: z.number().describe("Tasa de interés nominal anual en porcentaje (11.92 para 11.92 %). Si es un rango, el valor mínimo («desde»)."),
      tae: z.number().nullable().describe("Tasa anual efectiva (TAE) en porcentaje si el documento la publica para ese mismo préstamo; si no, null."),
    }),
  ),
});
export type RateExtraction = z.infer<typeof Extraction>;

const PROMPT = `El documento anterior es la publicación oficial de tasas de una entidad financiera de República Dominicana.
Extrae las tasas de los préstamos para comprar vehículos en pesos dominicanos (RD$):
- Una entrada por condición: NEW para vehículos nuevos o 0 km; USED para usados. Si la entidad solo distingue «seminuevos», úsalos como USED.
- Si una misma tasa o rango cubre los vehículos sin distinguir nuevos de usados, devuélvela para NEW y para USED.
- Ignora préstamos personales, hipotecarios, con garantía de depósitos, leasing, préstamos en dólares y tasas de mora o de depósitos.
- Copia los números tal como aparecen. No calcules ni estimes: si el documento no trae tasa de vehículos, devuelve "rates" vacío.`;

/** Descarga el documento de tasas; si la fuente indica `link`, lo busca en la página `url`. */
export async function fetchSource(source: RateSource): Promise<SourceDocument> {
  let res = await get(source.url);
  if (source.link) {
    const href = findDocumentLink(await res.text(), source.link, source.url);
    if (!href) throw new Error(`No se encontró el enlace ${source.link} en ${source.url}.`);
    res = await get(href);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const isPdf = (res.headers.get("content-type") ?? "").includes("pdf") || body.subarray(0, 5).toString() === "%PDF-";
  return { url: res.url, kind: isPdf ? "pdf" : "html", body };
}

/** GET con dos reintentos ante errores de red o 5xx (algunos sitios fallan de forma intermitente). */
async function get(url: string, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(45_000) });
    if (res.status >= 500 && attempt < 3) throw new Error(`${url} respondió ${res.status}.`);
    if (!res.ok) throw new Error(`${url} respondió ${res.status}.`);
    return res;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 5_000 * attempt));
    return get(url, attempt + 1);
  }
}

/**
 * URL del documento en la página: el primer texto que cumple `pattern` (su grupo 1 si lo tiene,
 * para patrones que incluyen el contexto del enlace), como URL absoluta.
 */
export function findDocumentLink(html: string, pattern: RegExp, base: string) {
  // Las páginas que embeben sus datos como JavaScript escriben las barras como \u002F.
  const m = html.replaceAll("&amp;", "&").replace(/\\u002F/gi, "/").match(pattern);
  const href = m?.[1] ?? m?.[0];
  return href ? new URL(href, base).href : null;
}

export async function extractRates(client: ClaudeClient, doc: SourceDocument): Promise<RateExtraction> {
  const text = doc.kind === "html" ? htmlToText(doc.body.toString("utf8")) : "";
  if (doc.kind === "html" && text.length > MAX_TEXT_CHARS) throw new Error(`La página ${doc.url} es demasiado larga (${text.length} caracteres).`);
  const document: Anthropic.Beta.BetaRequestDocumentBlock =
    doc.kind === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: doc.body.toString("base64") } }
      : { type: "document", source: { type: "text", media_type: "text/plain", data: text } };
  const msg = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16_000,
    ...refusalFallback(),
    output_config: { format: betaZodOutputFormat(Extraction) },
    messages: [{ role: "user", content: [document, { type: "text", text: PROMPT }] }],
  });
  if (msg.stop_reason === "refusal") throw new Error(`Claude rechazó leer ${doc.url}.`);
  if (!msg.parsed_output) throw new Error(`Claude no devolvió una extracción válida de ${doc.url} (${msg.stop_reason}).`);
  return msg.parsed_output;
}

export type ValidRate = { condition: "NEW" | "USED"; rate: number; tae: number | null };

/**
 * Rechaza valores imposibles antes de publicarlos (se publican sin revisión manual): una tasa
 * fuera de 3 %–40 % o una TAE menor que la nominal indican una lectura equivocada.
 * Con varias tasas para la misma condición se queda la menor («desde»).
 */
export function validateExtraction(x: RateExtraction, today: string) {
  const rates = new Map<ValidRate["condition"], ValidRate>();
  for (const r of x.rates) {
    if (!(r.rate >= 3 && r.rate <= 40)) throw new Error(`Tasa fuera de rango: ${r.rate} %.`);
    if (r.tae !== null && !(r.tae >= r.rate - 0.01 && r.tae <= 60)) throw new Error(`TAE incoherente: ${r.tae} % para una tasa de ${r.rate} %.`);
    const prev = rates.get(r.condition);
    if (!prev || r.rate < prev.rate) rates.set(r.condition, { condition: r.condition, rate: round2(r.rate), tae: r.tae === null ? null : round2(r.tae) });
  }
  if (!rates.size) throw new Error("El documento no trae tasas de préstamos de vehículos.");
  let effectiveDate: Date | null = null;
  if (x.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(x.effectiveDate) && !Number.isNaN(Date.parse(x.effectiveDate))) {
    // Una fecha posterior a hoy sería una vigencia futura o un error de lectura: no se muestra.
    if (x.effectiveDate <= today) effectiveDate = new Date(x.effectiveDate);
  }
  return { rates: [...rates.values()], effectiveDate };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Lee la fuente de la entidad y publica sus tasas. Si el documento es idéntico al de la última
 * extracción solo se renueva la fecha de verificación (sin llamar a Claude). Las condiciones que
 * el documento ya no trae se retiran: la publicación de la entidad es la fuente de verdad.
 */
export async function refreshLenderRates(client: ClaudeClient, lender: Lender & { rates: RateSource }, today: string) {
  const doc = await fetchSource(lender.rates);
  const sourceHash = createHash("sha256").update(doc.body).digest("hex");
  const checkedAt = new Date();
  const stored = await db.loanRate.findMany({ where: { lender: lender.slug } });
  if (stored.length && stored.every((r) => r.sourceHash === sourceHash)) {
    await db.loanRate.updateMany({ where: { lender: lender.slug }, data: { checkedAt } });
    const rates: ValidRate[] = stored.map((r) => ({ condition: r.condition, rate: r.rate, tae: r.tae }));
    return { rates, effectiveDate: stored[0].effectiveDate, sourceUrl: doc.url, unchanged: true };
  }

  const { rates, effectiveDate } = validateExtraction(await extractRates(client, doc), today);
  await db.$transaction([
    db.loanRate.deleteMany({ where: { lender: lender.slug, condition: { notIn: rates.map((r) => r.condition) } } }),
    ...rates.map((r) => {
      const data = { rate: r.rate, tae: r.tae, effectiveDate, sourceUrl: doc.url, sourceHash, checkedAt };
      return db.loanRate.upsert({
        where: { lender_condition: { lender: lender.slug, condition: r.condition } },
        create: { lender: lender.slug, condition: r.condition, ...data },
        update: data,
      });
    }),
  ]);
  return { rates, effectiveDate, sourceUrl: doc.url, unchanged: false };
}
