import "server-only";
import { db } from "@/lib/db";
import { LENDERS, LENDER_KIND_LABEL, type Lender } from "@/lib/lenders";
import type { Condition } from "@/generated/prisma/enums";

/** Tasa publicada por una entidad para una condición, lista para la calculadora (serializable). */
export type LoanOffer = {
  lender: string;
  name: string;
  logo: string;
  kind: string;
  loanUrl: string;
  phone: string | null;
  condition: Condition;
  rate: number;
  tae: number | null;
  maxFinancingPct: number | null;
  maxTermMonths: number | null;
  /** Fechas ya formateadas en el servidor: el navegador podría abreviar los meses distinto. */
  effectiveOn: string | null;
  checkedOn: string;
  sourceUrl: string;
};

export type LenderContact = { slug: string; name: string; logo: string; kind: string; loanUrl: string; phone: string | null; terms: string | null; pending: boolean };

/** "Nuevos: financia hasta 90 %, 72 meses · Usados: …", o `null` si la entidad no publica condiciones. */
function termsSummary(lender: Lender) {
  const parts = (["NEW", "USED"] as const).flatMap((c) => {
    const t = lender.terms?.[c];
    const items = [t?.maxFinancingPct && `hasta ${t.maxFinancingPct} %`, t?.maxTermMonths && `${t.maxTermMonths} meses`].filter(Boolean);
    return items.length ? `${c === "NEW" ? "Nuevos" : "Usados"}: financia ${items.join(", ")}` : [];
  });
  return parts.length ? parts.join(" · ") : null;
}

const dateOnly = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const rdDate = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santo_Domingo" });

/** Tasas vigentes de las entidades del catálogo y las entidades sin tasa publicada. */
export async function getFinancingData() {
  const rows = await db.loanRate.findMany({ orderBy: { rate: "asc" } });
  const offers: LoanOffer[] = rows.flatMap((r) => {
    const lender = LENDERS.find((l) => l.slug === r.lender);
    if (!lender) return [];
    const terms = lender.terms?.[r.condition];
    return {
      lender: lender.slug,
      name: lender.name,
      logo: lender.logo,
      kind: LENDER_KIND_LABEL[lender.kind],
      loanUrl: lender.loanUrl,
      phone: lender.phone ?? null,
      condition: r.condition,
      rate: r.rate,
      tae: r.tae,
      maxFinancingPct: terms?.maxFinancingPct ?? null,
      maxTermMonths: terms?.maxTermMonths ?? null,
      effectiveOn: r.effectiveDate ? dateOnly.format(r.effectiveDate) : null,
      checkedOn: rdDate.format(r.checkedAt),
      sourceUrl: r.sourceUrl,
    };
  });
  const withRates = new Set(offers.map((o) => o.lender));
  const others: LenderContact[] = LENDERS.filter((l) => !withRates.has(l.slug)).map((l) => ({
    slug: l.slug,
    name: l.name,
    logo: l.logo,
    kind: LENDER_KIND_LABEL[l.kind],
    loanUrl: l.loanUrl,
    phone: l.phone ?? null,
    terms: termsSummary(l),
    // Tiene fuente pero el trabajo diario aún no ha publicado sus tasas (o el documento ya no las trae).
    pending: !!l.rates,
  }));
  return { offers, others };
}
