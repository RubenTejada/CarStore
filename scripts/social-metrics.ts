/**
 * Métricas de las publicaciones en Facebook e Instagram (GitHub Actions, `.github/workflows/social-metrics.yml`):
 * lee de Meta el alcance y las interacciones de las publicaciones de los últimos 90 días (ver src/lib/social/metrics.ts).
 *
 *   npm run social:metrics
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { db } from "@/lib/db";
import { isMetaConfigured } from "@/lib/social/meta";
import { syncMetrics } from "@/lib/social/metrics";

let failed = 0;
const lines: string[] = [];

async function main() {
  if (!isMetaConfigured()) {
    lines.push("Sin META_APP_ID, META_APP_SECRET o SOCIAL_TOKEN_KEY: no se leen métricas.");
    return;
  }
  const s = await syncMetrics({ limit: 2000 });
  failed = s.failed && !s.updated ? 1 : 0;
  lines.push("## Métricas de redes", "", `- Publicaciones actualizadas: ${s.updated}`, `- Fallidas: ${s.failed}`);
}

main()
  .catch((error) => {
    failed = 1;
    lines.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
  })
  .finally(async () => {
    console.log(lines.join("\n"));
    await db.$disconnect();
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
    process.exitCode = failed ? 1 : 0;
  });
