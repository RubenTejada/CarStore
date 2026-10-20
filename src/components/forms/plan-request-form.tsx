"use client";

import { requestPlan } from "@/app/actions/plans";
import { formatPrice } from "@/lib/labels";
import { button, input, label } from "@/components/ui/styles";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";

type Plan = { id: string; name: string; priceDop: number; maxActiveListings: number; featuredSlots: number; durationDays: number };

export function PlanRequestForm({ plans }: { plans: Plan[] }) {
  const { state, pending, onSubmit } = useFormAction(requestPlan);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className={label}>Plan</legend>
        {plans.map((p, i) => (
          <label key={p.id} className="cursor-pointer rounded-xl border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/20">
            <input type="radio" name="planId" value={p.id} defaultChecked={i === 0} className="sr-only" />
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-bold">{p.name}</span>
              <span className="wide font-extrabold">{formatPrice(p.priceDop, "DOP")}</span>
            </span>
            <span className="mt-1 block text-sm text-muted">
              {p.maxActiveListings} vehículos, {p.featuredSlots} destacados, {p.durationDays} días
            </span>
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
      <button type="submit" disabled={pending} className={button("primary")}>
        Solicitar plan
      </button>
    </form>
  );
}
