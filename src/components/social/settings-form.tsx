"use client";

import { saveSocialSettings } from "@/app/actions/social";
import { SimpleForm } from "@/components/forms/simple-form";

export function SocialSettingsForm({ autoPublish, publishFacebook, publishInstagram, hasInstagram }: { autoPublish: boolean; publishFacebook: boolean; publishInstagram: boolean; hasInstagram: boolean }) {
  return (
    <SimpleForm action={saveSocialSettings} submit="Guardar preferencias" resetOnSuccess={false}>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="autoPublish" defaultChecked={autoPublish} className="mt-0.5 size-4" />
        <span>
          <span className="font-medium">Publicar automáticamente</span>
          <span className="block text-muted">Cada vehículo se publica en redes la primera vez que lo publicas en el portal, con su anuncio o con tu diseño por defecto.</span>
        </span>
      </label>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="publishFacebook" defaultChecked={publishFacebook} className="size-4" /> En la página de Facebook
      </label>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="publishInstagram" defaultChecked={publishInstagram} disabled={!hasInstagram} className="size-4" /> En Instagram {hasInstagram ? "" : "(vincula una cuenta profesional a tu página)"}
      </label>
    </SimpleForm>
  );
}
