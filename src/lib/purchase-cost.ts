// Gastos de comprar un vehículo usado en República Dominicana, además del precio (estimación de referencia).
import type { Condition } from "@/generated/prisma/enums";

/**
 * Impuesto de traspaso de la DGII: 2 % del valor del vehículo según su tabla de valores, más la
 * impresión de la matrícula. Fuente: DGII, «Trámites: Traspaso de Vehículos de Motor» (2025).
 */
export const TRANSFER_TAX_PCT = 2;
export const REGISTRATION_PRINT_FEE = 100;

/**
 * Marbete (impuesto de circulación, se renueva cada año) del período 2025-2026: RD$3,000 para
 * vehículos de 2021 en adelante y RD$1,500 para los anteriores. Revisar cada período en dgii.gov.do.
 */
export const MARBETE = { period: "2025-2026", newerFromYear: 2021, newer: 3_000, older: 1_500 };

export type CostLine = { label: string; amount: number; note: string };

export const marbeteFor = (year: number) => (year >= MARBETE.newerFromYear ? MARBETE.newer : MARBETE.older);

/**
 * Gastos del comprador sobre `priceDop`. Un vehículo nuevo sale del dealer con su primera placa,
 * que se tramita aparte: no lleva traspaso.
 */
export function purchaseCosts(v: { condition: Condition; year: number; priceDop: number }): CostLine[] {
  if (v.condition === "NEW") return [];
  return [
    {
      label: `Traspaso (${TRANSFER_TAX_PCT} %)`,
      amount: Math.round((v.priceDop * TRANSFER_TAX_PCT) / 100),
      note: "La DGII lo calcula sobre el valor de su tabla, que puede ser distinto del precio.",
    },
    { label: "Impresión de la matrícula", amount: REGISTRATION_PRINT_FEE, note: "Cargo de la DGII al emitir la matrícula a tu nombre." },
    { label: "Marbete", amount: marbeteFor(v.year), note: `Renovación anual, tarifa del período ${MARBETE.period}. Si está vigente, lo pagas en la próxima renovación.` },
  ];
}
