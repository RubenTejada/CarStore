"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormState } from "@/app/actions/auth";
import { cn } from "@/lib/cn";

/** Botón que ejecuta una Server Action y muestra el resultado como aviso temporal. */
export function ActionButton({
  action,
  children,
  confirm,
  className,
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FormState>();

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(undefined), 4000);
    return () => clearTimeout(t);
  }, [result]);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setResult(await action()));
        }}
        className={cn("disabled:opacity-50", className)}
      >
        {children}
      </button>
      {result && (
        <p
          role={result.error ? "alert" : "status"}
          className={cn(
            "fixed right-4 bottom-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl",
            result.error ? "bg-accent" : "bg-night",
          )}
        >
          {result.error ?? result.ok}
        </p>
      )}
    </>
  );
}
