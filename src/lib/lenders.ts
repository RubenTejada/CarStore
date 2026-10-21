import type { Condition } from "@/generated/prisma/enums";

/**
 * Entidades que financian vehículos en República Dominicana.
 *
 * Aquí está lo que cambia poco y se verifica a mano (datos de contacto, inicial y plazo según la
 * página oficial del producto). Las tasas cambian a menudo: las lee cada día el trabajo
 * `scripts/update-rates.ts` desde `rates` y se guardan en la tabla `LoanRate`.
 * Una entidad sin `rates` no publica sus tasas en un documento legible sin navegador
 * (o lo bloquea), así que se muestra con «Consultar tasa».
 */

export type LenderKind = "BANCO_MULTIPLE" | "ASOCIACION" | "BANCO_AHORRO_CREDITO" | "CORPORACION_CREDITO";

export const LENDER_KIND_LABEL: Record<LenderKind, string> = {
  BANCO_MULTIPLE: "Banco múltiple",
  ASOCIACION: "Asociación de ahorros y préstamos",
  BANCO_AHORRO_CREDITO: "Banco de ahorro y crédito",
  CORPORACION_CREDITO: "Corporación de crédito",
};

/** Dónde publica la entidad sus tasas. `link`: el documento cambia de nombre con cada versión y se busca en la página `url`. */
export type RateSource = { url: string; link?: RegExp };

/** Condiciones publicadas en la página oficial del producto (`loanUrl`). */
export type LoanTerms = { maxFinancingPct?: number; maxTermMonths?: number };

export type Lender = {
  slug: string;
  name: string;
  kind: LenderKind;
  website: string;
  /** Página del préstamo de vehículos. */
  loanUrl: string;
  phone?: string;
  rates?: RateSource;
  terms?: Partial<Record<Condition, LoanTerms>>;
};

export const LENDERS: Lender[] = [
  {
    slug: "banreservas",
    name: "Banreservas",
    kind: "BANCO_MULTIPLE",
    website: "https://www.banreservas.com",
    loanUrl: "https://www.banreservas.com/personal/prestamos/prestamos-vehiculos-nuevos/",
    rates: { url: "https://www.banreservas.com/", link: /tasas-de-referencia[^"']*\.pdf/i },
  },
  {
    slug: "apap",
    name: "APAP",
    kind: "ASOCIACION",
    website: "https://www.apap.com.do",
    loanUrl: "https://www.apap.com.do/",
    rates: { url: "https://www.apap.com.do/acerca-apap/tasas-de-interes/", link: /Tarifario-Escala-de-Tasas[^"']*\.pdf/i },
  },
];

export const lenderBySlug = (slug: string) => LENDERS.find((l) => l.slug === slug);
