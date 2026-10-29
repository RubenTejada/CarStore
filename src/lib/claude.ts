import Anthropic from "@anthropic-ai/sdk";
import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";

/**
 * Cliente de Claude para las tareas que leen documentos de terceros (tasas de préstamos, anuncios
 * de otros portales). Con `ANTHROPIC_FOUNDRY_RESOURCE` (o `ANTHROPIC_FOUNDRY_BASE_URL`) usa Claude en
 * Microsoft Foundry (Azure), autenticado con `ANTHROPIC_FOUNDRY_API_KEY`; si no, la API de Anthropic
 * con `ANTHROPIC_API_KEY`. En Foundry el nombre del despliegue debe ser el id del modelo (`CLAUDE_MODEL`).
 * Sin dependencias de Next: también lo usa `scripts/update-rates.ts`.
 */

export const CLAUDE_MODEL = "claude-opus-5-5";

const onFoundry = () => !!(process.env.ANTHROPIC_FOUNDRY_RESOURCE || process.env.ANTHROPIC_FOUNDRY_BASE_URL);

export function isClaudeConfigured() {
  return onFoundry() ? !!process.env.ANTHROPIC_FOUNDRY_API_KEY : !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export type ClaudeClient = Anthropic | AnthropicFoundry;

export function createClaudeClient(): ClaudeClient {
  return onFoundry() ? new AnthropicFoundry() : new Anthropic();
}

let shared: ClaudeClient | null = null;
/** Cliente compartido para las llamadas de las páginas y acciones (búsqueda, descripciones). */
export const getClaudeClient = () => (shared ??= createClaudeClient());

/**
 * En la API de Anthropic, si un clasificador de seguridad rechaza la petición se repite con el
 * modelo de respaldo. Foundry no admite ese parámetro: allí un rechazo llega como `refusal`.
 */
export function refusalFallback() {
  return onFoundry() ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}
