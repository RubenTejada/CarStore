"use client";

import { disconnectSocial, refreshSocialMetrics, selectSocialPage } from "@/app/actions/social";
import { ActionButton } from "@/components/panel/action-button";
import { button } from "@/components/ui/styles";

export function SelectPageButton({ pageId, name }: { pageId: string; name: string }) {
  return (
    <ActionButton action={() => selectSocialPage(pageId)} className={button("brand", "sm")}>
      Conectar {name}
    </ActionButton>
  );
}

export function DisconnectButton() {
  return (
    <ActionButton action={disconnectSocial} confirm="¿Desconectar Facebook e Instagram? Dejarán de publicarse los vehículos nuevos." className={button("danger", "sm")}>
      Desconectar
    </ActionButton>
  );
}

export function RefreshMetricsButton() {
  return (
    <ActionButton action={refreshSocialMetrics} className={button("outline", "sm")}>
      Actualizar métricas
    </ActionButton>
  );
}
