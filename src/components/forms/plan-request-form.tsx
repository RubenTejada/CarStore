"use client";

import { useState } from "react";
import { requestPlan } from "@/app/actions/plans";
import { formatPrice, formatUsdCents } from "@/lib/labels";
import { button, input, label } from "@/components/ui/styles";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";
import { LegalAcceptance, LegalLink } from "@/components/legal/acceptance";
import type { PlanOffer } from "@/lib/plan-offer";

type Plan = PlanOffer;

const methodOption = "cursor-pointer rounded-xl border border-line bg-surface px-4 py-3 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/20";

/** `usdDop`: tasa del BCRD del día, para mostrar el importe en USD de la solicitud de pago de Payoneer. */
export function PlanRequestForm({ plans, usdDop }: { plans: Plan[]; usdDop: number }) {
  const { state, pending, onSubmit } = useFormAction(requestPlan);
  const [method, setMethod] = useState<"PAYONEER_LINK" | "TRANSFER">("PAYONEER_LINK");
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className={label}>Plan</legend>
        {plans.map((p, i) => (
          <label key={p.id} className="cursor-pointer rounded-xl border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/20">
            <input type="radio" name="planOffer" value={JSON.stringify(p)} defaultChecked={i === 0} className="sr-only" />
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-bold">{p.name}</span>
              <span className="wide font-extrabold">{formatPrice(p.priceDop, "DOP")}</span>
            </span>
            {method === "PAYONEER_LINK" && <span className="block text-right text-sm text-muted">{formatUsdCents(Math.round((p.priceDop / usdDop) * 100))} con tarjeta</span>}
            <span className="mt-1 block text-sm text-muted">
              {p.maxActiveListings} vehículos, {p.featuredSlots} destacados, {p.durationDays} días
            </span>
            {p.officialSite && <span className="mt-2 mr-1.5 inline-block rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold text-night">Página oficial con tu logo y dominio</span>}
            {p.socialModule && <span className="mt-2 inline-block rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-ink">Publicación en Facebook e Instagram</span>}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-3">
        <legend className={label}>Forma de pago</legend>
        <label className={methodOption}>
          <input type="radio" name="method" value="PAYONEER_LINK" checked={method === "PAYONEER_LINK"} onChange={() => setMethod("PAYONEER_LINK")} className="sr-only" />
          <span className="font-bold">Tarjeta de crédito o débito</span>
          <span className="block text-sm text-muted">Enlace de pago de Payoneer</span>
        </label>
        <label className={methodOption}>
          <input type="radio" name="method" value="TRANSFER" checked={method === "TRANSFER"} onChange={() => setMethod("TRANSFER")} className="sr-only" />
          <span className="font-bold">Transferencia bancaria</span>
          <span className="block text-sm text-muted">Escribe la referencia del banco</span>
        </label>
      </fieldset>
      {method === "TRANSFER" ? (
        <>
          <div className="max-w-sm">
            <label htmlFor="paymentRef" className={label}>
              Referencia de la transferencia
            </label>
            <input id="paymentRef" name="paymentRef" required placeholder="Ej. 000123456" className={input} />
            <p className="mt-1 text-sm text-muted">Transfiere el monto del plan y escribe aquí el número de referencia del banco.</p>
          </div>
          <p className="text-sm text-muted">El plan se activa tras verificar el pago. No se renueva ni se cobra automáticamente. Al vencer vuelve al plan Gratis, sin destacados, y se pausan los anuncios que superen el cupo. Antes de transferir, confirma con el operador el total con impuestos y la cuenta beneficiaria.</p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Te enviaremos por correo una solicitud de pago de Payoneer y pagarás en su página segura; tus datos de tarjeta no pasan por TuCarroOnline. El cargo es en dólares (USD), convertido con la tasa del Banco Central del día; tu banco puede cobrar comisiones por cargos en moneda extranjera. El plan se activa cuando recibamos el pago. No se renueva ni se cobra automáticamente. Al vencer vuelve al plan Gratis, sin destacados, y se pausan los anuncios que superen el cupo.
        </p>
      )}
      <LegalAcceptance>Acepto las condiciones de <LegalLink doc="pagos">planes, pagos y reembolsos</LegalLink> para el plan seleccionado y los <LegalLink doc="terminos">Términos de uso</LegalLink>. El plan es para publicar anuncios y no garantiza ventas.</LegalAcceptance>
      <button type="submit" disabled={pending} className={button("primary")}>
        Solicitar plan
      </button>
    </form>
  );
}
