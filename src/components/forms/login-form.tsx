"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { button, input, label } from "@/components/ui/styles";
import { FormMessage } from "./form-message";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <label htmlFor="email" className={label}>
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      <button type="submit" disabled={pending} className={`${button("brand", "lg")} w-full`}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
