"use client";

import { useState } from "react";
import { CalendarCheck, Send } from "lucide-react";
import { requestContact } from "@/app/actions/contact";
import { FormMessage } from "@/components/forms/form-message";
import { useFormAction } from "@/components/forms/use-form-action";
import { button, input, label } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

type Props = {
  vehicleId: string;
  /** Datos de la cuenta, si hay sesión. */
  defaults: { name: string; phone: string; email: string };
  minDate: string;
  maxDate: string;
};

/** Formulario «Me interesa» / prueba de manejo de la ficha. */
export function ContactRequestForm({ vehicleId, defaults, minDate, maxDate }: Props) {
  const { state, pending, onSubmit } = useFormAction(requestContact.bind(null, vehicleId));
  const [kind, setKind] = useState<"INFO" | "TEST_DRIVE">("INFO");
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <fieldset>
        <legend className="sr-only">Qué quieres</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
          {(
            [
              ["INFO", "Me interesa"],
              ["TEST_DRIVE", "Prueba de manejo"],
            ] as const
          ).map(([value, text]) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="peer sr-only" />
              <span className="block rounded-md py-2 text-center text-sm font-semibold text-muted peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {text}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* Campo trampa para robots: invisible y fuera del orden de tabulación. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-name" className={label}>
            Nombre
          </label>
          <input id="cr-name" name="name" autoComplete="name" required defaultValue={defaults.name} className={input} />
        </div>
        <div>
          <label htmlFor="cr-phone" className={label}>
            Teléfono / WhatsApp
          </label>
          <input id="cr-phone" name="phone" type="tel" autoComplete="tel" required placeholder="809-555-0000" defaultValue={defaults.phone} className={input} />
        </div>
        <div>
          <label htmlFor="cr-email" className={label}>
            Correo <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input id="cr-email" name="email" type="email" autoComplete="email" defaultValue={defaults.email} className={input} />
        </div>
        {kind === "TEST_DRIVE" && (
          <div>
            <label htmlFor="cr-date" className={label}>
              Día preferido
            </label>
            <input id="cr-date" name="preferredDate" type="date" required min={minDate} max={maxDate} className={input} />
          </div>
        )}
      </div>
      <div>
        <label htmlFor="cr-message" className={label}>
          Mensaje <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="cr-message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={kind === "TEST_DRIVE" ? "Ej. Prefiero en la tarde." : "Ej. ¿Acepta vehículo como parte del pago?"}
          className={cn(input, "h-auto py-2.5")}
        />
      </div>
      <p className="text-xs text-muted">Tus datos se envían solo al vendedor de este vehículo para que te contacte.</p>
      <button type="submit" disabled={pending} className={cn(button("brand", "lg"), "w-full sm:w-auto")}>
        {kind === "TEST_DRIVE" ? <CalendarCheck className="size-5" aria-hidden /> : <Send className="size-5" aria-hidden />}
        {pending ? "Enviando…" : kind === "TEST_DRIVE" ? "Pedir prueba de manejo" : "Enviar al vendedor"}
      </button>
    </form>
  );
}
