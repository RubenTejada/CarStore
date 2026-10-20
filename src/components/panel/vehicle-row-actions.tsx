"use client";

import type { FormState } from "@/app/actions/auth";
import type { VehicleStatus } from "@/generated/prisma/enums";
import { button } from "@/components/ui/styles";
import { ActionButton } from "./action-button";

type Action = () => Promise<FormState>;

export function VehicleRowActions({
  status,
  featured,
  actions,
}: {
  status: VehicleStatus;
  featured: boolean;
  actions: { publish: Action; pause: Action; sold: Action; feature: Action; remove: Action };
}) {
  return (
    <>
      {status !== "ACTIVE" && (
        <ActionButton action={actions.publish} className={button("brand", "sm")}>
          Publicar
        </ActionButton>
      )}
      {status === "ACTIVE" && (
        <>
          <ActionButton action={actions.feature} className={button("ghost", "sm")}>
            {featured ? "Quitar destacado" : "Destacar"}
          </ActionButton>
          <ActionButton action={actions.pause} className={button("ghost", "sm")}>
            Pausar
          </ActionButton>
          <ActionButton action={actions.sold} className={button("ghost", "sm")}>
            Vendido
          </ActionButton>
        </>
      )}
      <ActionButton action={actions.remove} confirm="¿Eliminar este vehículo? Esta acción no se puede deshacer." className={button("danger", "sm")}>
        Eliminar
      </ActionButton>
    </>
  );
}
