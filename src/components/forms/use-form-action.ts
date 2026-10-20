"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

/**
 * Como useActionState, pero envía desde onSubmit para que React no
 * reinicie los campos del formulario cuando la acción devuelve un error.
 */
export function useFormAction(action: (state: FormState, form: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit };
}
