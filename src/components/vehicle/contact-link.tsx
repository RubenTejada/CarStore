"use client";

import type { LeadKind } from "@/generated/prisma/enums";

/** Enlace de contacto (WhatsApp o llamada) que anota el toque para la analítica del vendedor sin frenar la navegación. */
export function ContactLink({ vehicleId, kind, ...props }: React.ComponentProps<"a"> & { vehicleId: string; kind: LeadKind }) {
  return (
    <a
      {...props}
      onClick={() => {
        try {
          navigator.sendBeacon(`/api/vehiculos/${vehicleId}/contacto`, kind);
        } catch {}
      }}
    />
  );
}
