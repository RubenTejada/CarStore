"use client";

import { useState } from "react";
import { register } from "@/app/actions/auth";
import { button, input, label } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";

export function RegisterForm({ defaultKind, provinces }: { defaultKind: "particular" | "dealer"; provinces: string[] }) {
  const { state, pending, onSubmit } = useFormAction(register);
  const [kind, setKind] = useState(defaultKind);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <fieldset>
        <legend className={label}>Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["particular", "Particular", "Vendo mi vehículo"],
              ["dealer", "Dealer", "Tengo un negocio de vehículos"],
            ] as const
          ).map(([value, title, text]) => (
            <label key={value} className={cn("cursor-pointer rounded-lg border p-3", kind === value ? "border-brand bg-brand/10" : "border-line bg-surface")}>
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              <span className="block font-bold">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "dealer" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dealerName" className={label}>
              Nombre del dealer
            </label>
            <input id="dealerName" name="dealerName" required className={input} />
          </div>
          <div>
            <label htmlFor="province" className={label}>
              Provincia
            </label>
            <select id="province" name="province" required defaultValue="" className={input}>
              <option value="" disabled>
                Selecciona
              </option>
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="name" className={label}>
          Tu nombre
        </label>
        <input id="name" name="name" autoComplete="name" required className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={label}>
            Correo electrónico
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={input} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Teléfono / WhatsApp
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="809-555-0000" required className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
        <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres.</p>
      </div>
      {kind === "dealer" && <p className="text-sm text-muted">La administración revisa cada dealer antes de que pueda publicar.</p>}
      <button type="submit" disabled={pending} className={`${button("brand", "lg")} w-full`}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
