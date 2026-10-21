/**
 * Trabajo diario de tasas (GitHub Actions, `.github/workflows/daily-rates.yml`):
 *   1. Tasa del dólar del Banco Central del día, con el recálculo de `priceDop`.
 *   2. Tasas de préstamos de vehículos de cada entidad con fuente en `src/lib/lenders.ts`.
 * Cada paso es independiente: si una fuente falla se conservan sus últimos valores publicados
 * (con su fecha de verificación anterior) y el trabajo termina con error para avisar.
 *
 *   npm run rates:update               todo
 *   npm run rates:update -- apap       solo esas entidades (sin tasa del dólar)
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { ensureUsdRate, rdDay } from "@/lib/usd-rate";
import { LENDERS, type Lender, type RateSource } from "@/lib/lenders";
import { refreshLenderRates } from "@/lib/loan-rate-agent";
import { formatPct } from "@/lib/loan";

const only = process.argv.slice(2);
const today = rdDay();
const lines: string[] = [`## Tasas del ${today}`, ""];
let failures = 0;

const log = (line: string) => {
  console.log(line);
  lines.push(line);
};

async function main() {
  if (!only.length) {
    try {
      const row = await ensureUsdRate(today);
      log(`- ✅ Dólar BCRD: RD$${row.usdDop.toFixed(4)} (publicada el ${row.publishedOn.toISOString().slice(0, 10)})`);
    } catch (error) {
      failures++;
      log(`- ❌ Dólar BCRD: ${message(error)}`);
    }
  }

  const lenders = LENDERS.filter((l): l is Lender & { rates: RateSource } => !!l.rates && (!only.length || only.includes(l.slug)));
  const unknown = only.filter((slug) => !LENDERS.some((l) => l.slug === slug && l.rates));
  if (unknown.length) throw new Error(`Entidades sin fuente de tasas: ${unknown.join(", ")}`);

  const client = new Anthropic();
  // De una en una: son pocas y así un banco lento no compite con los demás por el tiempo de espera.
  for (const lender of lenders) {
    try {
      const { rates, effectiveDate, unchanged } = await refreshLenderRates(client, lender, today);
      const list = rates.map((r) => `${r.condition === "NEW" ? "nuevos" : "usados"} ${formatPct(r.rate)}${r.tae === null ? "" : ` (TAE ${formatPct(r.tae)})`}`).join(", ");
      log(`- ✅ ${lender.name}: ${list}${effectiveDate ? ` · vigente desde ${effectiveDate.toISOString().slice(0, 10)}` : ""}${unchanged ? " · documento sin cambios" : ""}`);
    } catch (error) {
      failures++;
      log(`- ❌ ${lender.name}: ${message(error)}`);
    }
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

main()
  .catch((error) => {
    failures++;
    log(`- ❌ ${message(error)}`);
  })
  .finally(async () => {
    await db.$disconnect();
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
    process.exitCode = failures ? 1 : 0;
  });
