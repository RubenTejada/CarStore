/**
 * Cálculo de cuotas de préstamos de vehículos (sistema francés: cuota fija mensual).
 * Las entidades dominicanas publican la tasa nominal anual; la cuota usa tasa / 12.
 */

export const LOAN_TERMS = [12, 24, 36, 48, 60, 72, 84] as const;
export const DEFAULT_TERM = 60;
/** Inicial habitual de partida para la calculadora (los bancos suelen financiar 80 %–90 %). */
export const DEFAULT_DOWN_PCT = 20;

/** Cuota mensual de capital e intereses. `annualRate` en porcentaje (p. ej. 11.92). */
export function monthlyPayment(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}

export type LoanQuote = { principal: number; payment: number; totalInterest: number; totalPaid: number };

/** Préstamo sobre `price` con un inicial de `downPct` %. */
export function quoteLoan(price: number, downPct: number, annualRate: number, months: number): LoanQuote {
  const principal = Math.max(0, price * (1 - downPct / 100));
  const payment = monthlyPayment(principal, annualRate, months);
  const totalPaid = payment * months;
  return { principal, payment, totalInterest: totalPaid - principal, totalPaid };
}

/** Tasa en porcentaje para mostrar: "11.92 %". */
export function formatPct(rate: number) {
  return `${rate.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}
