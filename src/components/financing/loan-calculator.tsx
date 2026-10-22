"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Info, TriangleAlert } from "lucide-react";
import { CONDITION_LABEL, formatPrice } from "@/lib/labels";
import { DEFAULT_DOWN_PCT, DEFAULT_TERM, LOAN_TERMS, formatPct, quoteLoan } from "@/lib/loan";
import type { LoanOffer } from "@/lib/financing";
import type { Condition } from "@/generated/prisma/enums";
import { input, label } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { LenderLogo } from "@/components/financing/lender-logo";

type Props = {
  offers: LoanOffer[];
  price: number;
  condition: Condition;
  /** En la ficha de un vehículo el precio y la condición son los del vehículo. */
  vehicle?: boolean;
  /** Cuántas entidades listar; el resto se ve en `moreHref`. */
  limit?: number;
  moreHref?: string;
};

const money = (n: number) => formatPrice(Math.round(n), "DOP");

/**
 * Calculadora de cuota (sistema francés) y comparador: la cuota de cada entidad con su tasa
 * publicada, para el mismo precio, inicial y plazo.
 */
export function LoanCalculator({ offers, price: initialPrice, condition: initialCondition, vehicle, limit, moreHref }: Props) {
  const [price, setPrice] = useState(initialPrice);
  const [condition, setCondition] = useState<Condition>(initialCondition);
  const [downPct, setDownPct] = useState(DEFAULT_DOWN_PCT);
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [customRate, setCustomRate] = useState<string>("");

  const ranked = useMemo(
    () =>
      offers
        .filter((o) => o.condition === condition)
        .map((o) => ({ ...o, quote: quoteLoan(price, downPct, o.rate, term) }))
        .sort((a, b) => a.quote.payment - b.quote.payment),
    [offers, condition, price, downPct, term],
  );
  const best = ranked[0];
  const rate = customRate === "" ? best?.rate : Number(customRate);
  const quote = rate !== undefined && Number.isFinite(rate) ? quoteLoan(price, downPct, rate, term) : null;
  const shown = limit ? ranked.slice(0, limit) : ranked;

  return (
    <div className={cn("grid gap-6", !vehicle && "lg:grid-cols-[22rem_1fr] lg:items-start")}>
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className={cn("grid gap-4", vehicle && "sm:grid-cols-2")}>
          {!vehicle && (
            <>
              <div>
                <label htmlFor="loan-price" className={label}>
                  Precio del vehículo (RD$)
                </label>
                <input id="loan-price" type="number" inputMode="numeric" min={0} step={10_000} value={price || ""} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} className={input} />
              </div>
              <fieldset>
                <legend className={label}>Condición</legend>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
                  {(["NEW", "USED"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={condition === c}
                      onClick={() => setCondition(c)}
                      className={cn("h-9 rounded-md text-sm font-semibold transition-colors", condition === c ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
                    >
                      {CONDITION_LABEL[c]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <div>
            <label htmlFor="loan-down" className={label}>
              Inicial: {downPct} % <span className="font-normal text-muted">({money((price * downPct) / 100)})</span>
            </label>
            <input id="loan-down" type="range" min={0} max={90} step={5} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="h-11 w-full accent-[var(--brand)]" />
          </div>
          <div>
            <label htmlFor="loan-term" className={label}>
              Plazo
            </label>
            <select id="loan-term" value={term} onChange={(e) => setTerm(Number(e.target.value))} className={input}>
              {LOAN_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t} meses ({t / 12} {t === 12 ? "año" : "años"})
                </option>
              ))}
            </select>
          </div>
          {!vehicle && (
            <div>
              <label htmlFor="loan-rate" className={label}>
                Tasa anual (%)
              </label>
              <input
                id="loan-rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={60}
                step={0.05}
                placeholder={best ? `${best.rate} (la menor publicada)` : "Ej. 12.5"}
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className={input}
              />
            </div>
          )}
        </div>

        {quote && (
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
            <div className="col-span-2">
              <dt className="text-muted">Cuota mensual estimada{customRate === "" && best ? ` (desde ${formatPct(best.rate)}, ${best.name})` : ` (${formatPct(rate!)})`}</dt>
              <dd className="display text-3xl text-brand">{money(quote.payment)}</dd>
            </div>
            <div>
              <dt className="text-muted">A financiar</dt>
              <dd className="font-semibold">{money(quote.principal)}</dd>
            </div>
            <div>
              <dt className="text-muted">Total de intereses</dt>
              <dd className="font-semibold">{money(quote.totalInterest)}</dd>
            </div>
          </dl>
        )}
        <p className="mt-4 flex gap-1.5 text-xs text-muted">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          Estimación con tasas de referencia. No incluye seguro del vehículo, seguro de vida ni gastos de cierre; la tasa final la fija la entidad según tu perfil.
        </p>
      </div>

      <div>
        {ranked.length ? (
          <ol className="grid gap-3 md:grid-cols-2">
            {shown.map((o, i) => {
              const needsDown = o.maxFinancingPct !== null && 100 - downPct > o.maxFinancingPct;
              const tooLong = o.maxTermMonths !== null && term > o.maxTermMonths;
              return (
                <li key={o.lender} className={cn("rounded-xl border bg-surface p-4", i === 0 ? "border-brand" : "border-line")}>
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="flex min-w-0 gap-3">
                      <LenderLogo src={o.logo} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold">
                          {o.name}
                          {i === 0 && <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-bold text-brand-ink">Menor cuota</span>}
                        </p>
                        <p className="text-xs text-muted">{o.kind}</p>
                        <p className="mt-2 text-sm">
                          Tasa desde <strong>{formatPct(o.rate)}</strong>
                          {o.tae !== null && <span className="text-muted"> · TAE {formatPct(o.tae)}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold tracking-tight text-brand">
                        {money(o.quote.payment)}
                        <span className="text-sm font-semibold text-muted">/mes</span>
                      </p>
                      <p className="text-xs text-muted">Intereses: {money(o.quote.totalInterest)}</p>
                    </div>
                  </div>
                  {(o.maxFinancingPct !== null || o.maxTermMonths !== null) && (
                    <p className="mt-2 text-xs text-muted">
                      {[o.maxFinancingPct !== null && `Financia hasta ${o.maxFinancingPct} %`, o.maxTermMonths !== null && `hasta ${o.maxTermMonths} meses`].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(needsDown || tooLong) && (
                    <p className="mt-2 flex gap-1.5 text-xs font-medium text-accent">
                      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                      {[needsDown && `Pide al menos ${100 - o.maxFinancingPct!} % de inicial`, tooLong && `su plazo máximo es ${o.maxTermMonths} meses`].filter(Boolean).join("; ")}.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                    {o.effectiveOn && <span>Vigente desde {o.effectiveOn}</span>}
                    <span>Verificada el {o.checkedOn}</span>
                    <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                      Fuente oficial <ExternalLink className="size-3" aria-hidden />
                    </a>
                    <a href={o.loanUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                      Ver préstamo <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
            Hoy ninguna entidad del portal publica una tasa para vehículos {condition === "NEW" ? "nuevos" : "usados"} que podamos verificar. Puedes calcular con tu propia tasa
            {vehicle ? " en la página de financiamiento" : " arriba"}.
          </p>
        )}
        {moreHref && (
          <Link href={moreHref} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            {ranked.length > shown.length ? `Comparar las ${ranked.length} entidades` : "Calculadora y entidades financieras"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
