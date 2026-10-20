import type { FormState } from "@/app/actions/auth";

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={state.error ? "rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent" : "rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm font-medium text-ok"}
    >
      {state.error ?? state.ok}
    </p>
  );
}
