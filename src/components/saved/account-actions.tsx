"use client";

import { ActionButton } from "@/components/panel/action-button";
import { resendVerification, setAlerts } from "@/app/actions/auth";
import { deleteSearch } from "@/app/actions/saved";
import { button } from "@/components/ui/styles";

// Botones de /cuenta: las Server Actions se atan aquí, del lado del cliente.

export function ResendVerificationButton() {
  return (
    <ActionButton action={resendVerification} className={button("outline", "sm")}>
      Reenviar enlace
    </ActionButton>
  );
}

export function AlertsToggle({ enabled }: { enabled: boolean }) {
  return (
    <ActionButton action={() => setAlerts(!enabled)} className={button(enabled ? "outline" : "brand", "sm")}>
      {enabled ? "Pausar alertas" : "Activar alertas"}
    </ActionButton>
  );
}

export function DeleteSearchButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionButton action={() => deleteSearch(id)} confirm={`¿Borrar la búsqueda «${name}»?`} className={button("ghost", "sm")}>
      Borrar
    </ActionButton>
  );
}
