"use client";

import { useState } from "react";
import { CircleCheck, Link2, LoaderCircle } from "lucide-react";
import { importListing, type ImportListingState } from "@/app/actions/import";
import { button, card, input } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { VehicleForm, type VehicleFormProps } from "./vehicle-form";
import { useFormAction } from "./use-form-action";

/**
 * «Publicar vehículo» con la opción de partir de un anuncio de otro portal: al importar, el
 * formulario se vuelve a montar con los datos y las fotos del anuncio para revisarlos y publicar.
 */
export function ListingImporter(props: VehicleFormProps) {
  const { state, pending, onSubmit } = useFormAction(importListing);
  // El último anuncio importado: un intento fallido después no borra lo que ya se llenó.
  const [imported, setImported] = useState<ImportListingState>();
  if (state?.values && state !== imported) setImported(state);

  return (
    <div className="space-y-8">
      <section className={cn(card, "border-brand/30 bg-brand/5 p-5 sm:p-6")}>
        <h2 className="wide flex items-center gap-2 text-lg font-bold">
          <Link2 className="size-5 text-brand" aria-hidden />
          ¿Ya lo tienes publicado en otro portal?
        </h2>
        <p className="mt-0.5 text-sm text-muted">Pega el enlace del anuncio (SuperCarros, Corotos, la web de tu dealer…) y llenamos el formulario con sus datos, características y fotos.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="import-url" className="sr-only">
              Enlace del anuncio
            </label>
            <input id="import-url" name="url" type="url" required inputMode="url" placeholder="https://www.supercarros.com/…" className={cn(input, "sm:flex-1")} />
            <button type="submit" disabled={pending} className={button("brand")}>
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {pending ? "Importando…" : "Importar"}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="owner" required className="mt-0.5 size-4 accent-[var(--brand)]" />
            Confirmo que el anuncio es mío o de mi dealer.
          </label>
          {pending && (
            <p role="status" className="text-sm text-muted">
              Leyendo el anuncio y copiando las fotos. Puede tardar hasta un minuto.
            </p>
          )}
          {!pending && state?.error && (
            <p role="alert" className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
              {state.error}
            </p>
          )}
          {!pending && state?.values && (
            <div role="status" className="rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ok">
                <CircleCheck className="size-4" aria-hidden />
                Importamos «{state.title}». Revisa los datos antes de publicar.
              </p>
              {!!state.notes?.length && (
                <ul className="mt-2 list-disc space-y-0.5 pl-6 text-ink">
                  {state.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </section>

      <VehicleForm key={imported?.at ?? "manual"} {...props} values={imported?.values ?? props.values} />
    </div>
  );
}
