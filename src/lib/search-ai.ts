import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, getClaudeClient, isClaudeConfigured, refusalFallback } from "@/lib/claude";
import { db } from "@/lib/db";
import { getSearchIndex } from "@/lib/catalog";
import { getUsdRate } from "@/lib/exchange-rate";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { takeToken } from "@/lib/rate-limit";
import { AiSearch, aiCatalog, aiSystemPrompt, applyAiSearch } from "@/lib/search-ai-parse";

// Respuestas ya interpretadas (texto + filtros vigentes): la misma búsqueda no vuelve a llamar a Claude.
const cache = new Map<string, Record<string, string> | null>();
const CACHE_MAX = 500;

/**
 * Traduce el texto libre que el buscador local no entendió a filtros de /vehiculos.
 * Devuelve los parámetros nuevos, o `null` si no hay clave de Claude, se superó el límite, falló
 * o no entendió nada: entonces sigue la búsqueda por texto de siempre. Nunca lanza.
 */
export async function interpretSearch(text: string, current: Record<string, string>, visitor: string): Promise<Record<string, string> | null> {
  if (!isClaudeConfigured()) return null;
  const rest = Object.fromEntries(Object.entries(current).filter(([k]) => k !== "q" && k !== "pagina"));
  const key = `${text.trim().toLowerCase()}|${JSON.stringify(Object.entries(rest).sort())}`;
  if (cache.has(key)) return cache.get(key)!;
  // Por visitante y en total por instancia: cada búsqueda nueva es una llamada de pago.
  if (!takeToken(`search:${visitor}`, 10, 60_000) || !takeToken("search:*", 120, 60_000)) return null;

  try {
    const [index, features, usd] = await Promise.all([getSearchIndex(), db.feature.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }), getUsdRate()]);
    const catalog = aiCatalog(index, features, PROVINCE_NAMES);
    const msg = await getClaudeClient().beta.messages.parse(
      {
        model: CLAUDE_MODEL,
        max_tokens: 4_000,
        ...refusalFallback(),
        output_config: { effort: "low", format: betaZodOutputFormat(AiSearch) },
        system: [{ type: "text", text: aiSystemPrompt(catalog), cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: `Tasa del día: 1 US$ = RD$${usd.rate.toFixed(2)}. Año actual: ${new Date().getFullYear()}.\nFiltros ya aplicados: ${JSON.stringify(rest)}\nTexto del visitante: «${text}»`,
          },
        ],
      },
      // El visitante espera la respuesta: mejor caer a la búsqueda por texto que hacerlo esperar.
      { timeout: 12_000, maxRetries: 1 },
    );
    const result = msg.stop_reason === "refusal" || !msg.parsed_output ? null : applyAiSearch(current, msg.parsed_output, catalog, text);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
    return result;
  } catch (error) {
    console.error("[búsqueda IA] no se pudo interpretar la búsqueda:", error);
    return null;
  }
}
