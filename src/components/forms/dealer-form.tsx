"use client";

import type { FormState } from "@/app/actions/auth";
import { button, card, input, label } from "@/components/ui/styles";
import { LocationPicker } from "@/components/map/location-picker";
import { SingleImageField } from "./photo-uploader";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";
import { cn } from "@/lib/cn";

type Dealer = {
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  address: string | null;
  province: string;
  lat: number;
  lng: number;
  logoUrl: string | null;
  coverUrl: string | null;
};

export function DealerForm({ action, dealer, provinces }: { action: (s: FormState, f: FormData) => Promise<FormState>; dealer: Dealer; provinces: string[] }) {
  const { state, pending, onSubmit } = useFormAction(action);
  const text = (name: keyof Dealer, title: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className={label}>
        {title}
      </label>
      <input id={name} name={name} defaultValue={(dealer[name] as string | null) ?? ""} className={input} {...props} />
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormMessage state={state} />
      <section className={cn(card, "space-y-5 p-6")}>
        <h2 className="wide text-lg font-bold">Imagen</h2>
        <SingleImageField name="logoUrl" kind="logo" label="logo" defaultValue={dealer.logoUrl} />
        <SingleImageField name="coverUrl" kind="cover" label="portada" defaultValue={dealer.coverUrl} />
      </section>
      <section className={cn(card, "grid gap-4 p-6 sm:grid-cols-2")}>
        <h2 className="wide text-lg font-bold sm:col-span-2">Información</h2>
        {text("name", "Nombre del dealer", { required: true })}
        {text("hours", "Horario", { placeholder: "Lun–Vie 8:30 a.m.–6:00 p.m." })}
        <div className="sm:col-span-2">
          <label htmlFor="description" className={label}>
            Descripción
          </label>
          <textarea id="description" name="description" rows={4} maxLength={1500} defaultValue={dealer.description ?? ""} className={cn(input, "h-auto py-2.5")} />
        </div>
        {text("phone", "Teléfono", { type: "tel" })}
        {text("whatsapp", "WhatsApp", { type: "tel", placeholder: "18095550000" })}
        {text("email", "Correo", { type: "email" })}
        {text("website", "Sitio web", { type: "url", placeholder: "https://" })}
      </section>
      <section className={cn(card, "space-y-4 p-6")}>
        <h2 className="wide text-lg font-bold">Ubicación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {text("address", "Dirección")}
          <div>
            <label htmlFor="province" className={label}>
              Provincia
            </label>
            <select id="province" name="province" defaultValue={dealer.province} className={input}>
              {provinces.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <LocationPicker defaultLat={dealer.lat} defaultLng={dealer.lng} />
      </section>
      <button type="submit" disabled={pending} className={button("primary", "lg")}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
