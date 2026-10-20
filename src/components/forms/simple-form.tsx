"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/auth";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";

/** Formulario genérico para acciones de administración (campos como children). */
export function SimpleForm({
  action,
  submit,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useFormAction(action);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={cn("space-y-4", className)}>
      <FormMessage state={state} />
      {children}
      <button type="submit" disabled={pending} className={button("brand")}>
        {pending ? "Guardando…" : submit}
      </button>
    </form>
  );
}
