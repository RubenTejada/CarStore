/**
 * Deja los planes activos de la base como el catálogo (src/lib/plan-catalog.ts), emparejados por nombre.
 * Un plan con solicitudes o períodos vigentes no se modifica: se desactiva y se crea uno nuevo, así los
 * contratos existentes conservan sus condiciones. Los planes activos fuera del catálogo dejan de ofrecerse.
 *
 *   npm run plans:sync            muestra lo que haría, sin escribir
 *   npm run plans:sync -- --yes   lo aplica en la base de DATABASE_URL
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { db } from "@/lib/db";
import { planSync, type CurrentPlan, type PlanSpec, type PlanSyncStep } from "@/lib/plan-catalog";

const apply = process.argv.includes("--yes");
const money = (n: number) => `RD$${n.toLocaleString("en-US")}`;
const terms = (p: PlanSpec) =>
  [money(p.priceDop), `${p.maxActiveListings} vehículos`, `${p.featuredSlots} destacados`, `${p.durationDays} días`, p.forDealers ? "dealers" : "particulares", p.socialModule && "redes sociales", p.officialSite && "página oficial"].filter(Boolean).join(", ");
const contracts = (p: CurrentPlan) => (p.openSubscriptions ? `, ${p.openSubscriptions} solicitudes o períodos vigentes` : "");

const describe = (s: PlanSyncStep) => {
  switch (s.kind) {
    case "keep": return `- ${s.current.name}: sin cambios (${terms(s.current)})`;
    case "create": return `- ${s.spec.name}: se crea (${terms(s.spec)})`;
    case "update": return `- ${s.spec.name}: se actualiza (${terms(s.current)}) → (${terms(s.spec)})${s.current.description !== s.spec.description ? ", descripción nueva" : ""}`;
    case "replace": return `- ${s.spec.name}: se reemplaza por uno nuevo (${terms(s.current)}${contracts(s.current)}) → (${terms(s.spec)}); el anterior queda inactivo con sus contratos`;
    case "deactivate": return `- ${s.current.name}: deja de ofrecerse, no está en el catálogo (${terms(s.current)}${contracts(s.current)})`;
  }
};

const lines: string[] = [];
const log = (line: string) => lines.push(line);

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://?").hostname || "(sin DATABASE_URL)";
  log(`## Planes (${apply ? "aplicando" : "simulación: agrega --yes para aplicar"})`);
  log("");
  log(`- Base: ${host}`);
  log("");

  const active: CurrentPlan[] = (
    await db.plan.findMany({
      where: { active: true },
      orderBy: [{ forDealers: "asc" }, { priceDop: "asc" }],
      include: { _count: { select: { subscriptions: { where: { status: { in: ["PENDING", "ACTIVE"] } } } } } },
    })
  ).map(({ _count, ...p }) => ({ ...p, openSubscriptions: _count.subscriptions }));

  const steps = planSync(active);
  for (const s of steps) log(describe(s));
  if (steps.every((s) => s.kind === "keep")) {
    log("");
    log("Los planes ya están como el catálogo.");
    return;
  }
  if (!apply) return;

  await db.$transaction(async (tx) => {
    for (const s of steps) {
      if (s.kind === "create") await tx.plan.create({ data: s.spec });
      else if (s.kind === "update") await tx.plan.update({ where: { id: s.current.id }, data: s.spec });
      else if (s.kind === "replace") {
        await tx.plan.update({ where: { id: s.current.id }, data: { active: false } });
        await tx.plan.create({ data: s.spec });
      } else if (s.kind === "deactivate") await tx.plan.update({ where: { id: s.current.id }, data: { active: false } });
    }
  });
  log("");
  log("Cambios aplicados.");
}

main()
  .catch((error) => {
    process.exitCode = 1;
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  })
  .finally(async () => {
    console.log(lines.join("\n"));
    await db.$disconnect();
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  });
