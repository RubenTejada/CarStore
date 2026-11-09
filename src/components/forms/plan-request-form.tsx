"use client";

import { requestPlan } from "@/app/actions/plans";
import { formatPrice } from "@/lib/labels";
import { button, input, label } from "@/components/ui/styles";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";
import { LegalAcceptance, LegalLink } from "@/components/legal/acceptance";
import type { PlanOffer } from "@/lib/plan-offer";

type Plan = PlanOffer;

export function PlanRequestForm({ plans }: { plans: Plan[] }) {
  const { state, pending, onSubmit } = useFormAction(requestPlan);
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
            <span className="mt-1 block text-sm text-muted">
              {p.maxActiveListings} vehículos, {p.featuredSlots} destacados, {p.durationDays} días
            </span>
            {p.officialSite && <span className="mt-2 mr-1.5 inline-block rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold text-night">Página oficial con tu logo y dominio</span>}
            {p.socialModule && <span className="mt-2 inline-block rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-ink">Publicación en Facebook e Instagram</span>}
          </label>
        ))}
      </fieldset>
      <div className="max-w-sm">
        <label htmlFor="paymentRef" className={label}>
          Referencia de la transferencia
        </label>
        <input id="paymentRef" name="paymentRef" required placeholder="Ej. 000123456" className={input} />
        <p className="mt-1 text-sm text-muted">Transfiere el monto del plan y escribe aquí el número de referencia del banco.</p>
      </div>
      <p className="text-sm text-muted">El plan se activa tras verificar el pago. No se renueva ni se cobra automáticamente. Al vencer vuelve al plan Gratis, sin destacados, y se pausan los anuncios que superen el cupo. Antes de transferir, confirma con el operador el total con impuestos y la cuenta beneficiaria.</p>
      <LegalAcceptance>Acepto las condiciones de <LegalLink doc="pagos">planes, pagos y reembolsos</LegalLink> para el plan seleccionado y los <LegalLink doc="terminos">Términos de uso</LegalLink>. El plan es para publicar anuncios y no garantiza ventas.</LegalAcceptance>
      <button type="submit" disabled={pending} className={button("primary")}>
        Solicitar plan
      </button>
    </form>
  );
}
