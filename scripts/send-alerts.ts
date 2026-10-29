/**
 * Alertas diarias por correo (GitHub Actions, `.github/workflows/daily-alerts.yml`): vehículos nuevos
 * en las búsquedas guardadas y rebajas de los guardados (ver src/lib/alerts.ts).
 *
 *   npm run alerts:send
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { sendAlerts } from "@/lib/alerts";

let failed = 0;
const lines: string[] = [];

async function main() {
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    lines.push("Sin AZURE_COMMUNICATION_CONNECTION_STRING o EMAIL_FROM: no se envían alertas.");
    failed = 1;
    return;
  }
  const s = await sendAlerts();
  failed = s.failed;
  lines.push("## Alertas", "", `- Cuentas revisadas: ${s.users}`, `- Correos enviados: ${s.sent}`, `- Fallidos: ${s.failed}`);
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
