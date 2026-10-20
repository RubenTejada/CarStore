"use client";

import { addTeamMember } from "@/app/actions/dealer";
import { button, input, label } from "@/components/ui/styles";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";

export function TeamForm() {
  const { state, pending, onSubmit } = useFormAction(addTeamMember);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="name" className={label}>
            Nombre
          </label>
          <input id="name" name="name" required className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Correo
          </label>
          <input id="email" name="email" type="email" required className={input} />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Contraseña inicial
          </label>
          <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
        </div>
      </div>
      <button type="submit" disabled={pending} className={button("brand")}>
        Agregar usuario
      </button>
    </form>
  );
}
