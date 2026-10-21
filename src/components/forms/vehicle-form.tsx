"use client";

import { useState } from "react";
import type { BodyType, FeatureCategory } from "@/generated/prisma/enums";
import type { FormState } from "@/app/actions/auth";
import {
  BODY_TYPES,
  COLORS,
  DRIVETRAIN_LABEL,
  FEATURE_CATEGORY_LABEL,
  FUEL_LABEL,
  TRANSMISSION_LABEL,
} from "@/lib/labels";
import { FeatureIcon } from "@/lib/feature-icons";
import { button, card, input, label } from "@/components/ui/styles";
import { LocationPicker } from "@/components/map/location-picker";
import { PhotoUploader } from "./photo-uploader";
import { View360Uploader } from "./view-360-uploader";
import { FormMessage } from "./form-message";
import { useFormAction } from "./use-form-action";
import { cn } from "@/lib/cn";

export type VehicleFormValues = {
  modelId: string;
  brandId: string;
  bodyType: BodyType;
  year: number;
  trimId: string;
  trim: string;
  condition: "NEW" | "USED";
  price: number | "";
  currency: "DOP" | "USD";
  mileageKm: number | "";
  transmission: string;
  fuel: string;
  drivetrain: string;
  engine: string;
  extColor: string;
  intColor: string;
  doors: number | "";
  seats: number | "";
  description: string;
  province: string;
  lat: number;
  lng: number;
  photos: string[];
  spinFrames: string[];
  interiorPano: string | null;
  features: string[];
  featured: boolean;
  /** Anuncio de otro portal del que se importó (ver actions/import.ts). */
  sourceUrl?: string;
};

export type VehicleFormProps = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  values: VehicleFormValues;
  brands: { id: string; name: string; models: { id: string; name: string; bodyType: BodyType; trims: { id: string; name: string }[] }[] }[];
  features: { slug: string; name: string; category: FeatureCategory; icon: string }[];
  provinces: string[];
  featuredHint: string;
};

const OTHER_TRIM = "otra";

export function VehicleForm({ action, values, brands, features, provinces, featuredHint }: VehicleFormProps) {
  const { state, pending, onSubmit } = useFormAction(action);
  const [brandId, setBrandId] = useState(values.brandId);
  const [modelId, setModelId] = useState(values.modelId);
  const [bodyType, setBodyType] = useState<BodyType>(values.bodyType);
  const [condition, setCondition] = useState(values.condition);
  // "" sin versión, OTHER_TRIM texto libre, o el id de una versión del catálogo.
  const [trimChoice, setTrimChoice] = useState(values.trimId || (values.trim ? OTHER_TRIM : ""));
  const models = brands.find((b) => b.id === brandId)?.models ?? [];
  const trims = models.find((m) => m.id === modelId)?.trims ?? [];
  const freeTrim = trims.length === 0 || trimChoice === OTHER_TRIM;
  const thisYear = new Date().getFullYear();

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <FormMessage state={state} />
      {values.sourceUrl && <input type="hidden" name="sourceUrl" value={values.sourceUrl} />}

      <Section title="Fotos" text="Sube buenas fotos: exterior, interior, tablero y motor.">
        <PhotoUploader name="photos" defaultValue={values.photos} />
      </Section>

      <Section title="Vista 360°" text="Opcional. Los anuncios con vista 360 muestran el auto girando y el interior para mirar alrededor.">
        <View360Uploader spinFrames={values.spinFrames} interiorPano={values.interiorPano} />
      </Section>

      <Section title="Vehículo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Marca" id="brand">
            <select
              id="brand"
              required
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setModelId("");
                setTrimChoice("");
              }}
              className={input}
            >
              <option value="">Selecciona la marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modelo" id="modelId">
            <select
              id="modelId"
              name="modelId"
              required
              value={modelId}
              disabled={!brandId}
              onChange={(e) => {
                setModelId(e.target.value);
                setTrimChoice("");
                const m = models.find((x) => x.id === e.target.value);
                if (m) setBodyType(m.bodyType);
              }}
              className={input}
            >
              <option value="">{brandId ? "Selecciona el modelo" : "Primero la marca"}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Versión" id={trims.length ? "trimId" : "trim"}>
            {trims.length > 0 && (
              <select id="trimId" value={trimChoice} onChange={(e) => setTrimChoice(e.target.value)} className={input}>
                <option value="">Sin especificar</option>
                {trims.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value={OTHER_TRIM}>Otra versión…</option>
              </select>
            )}
            {/* El valor enviado: id del catálogo, o vacío para usar el texto libre. */}
            <input type="hidden" name="trimId" value={freeTrim ? "" : trimChoice} />
            {freeTrim && (
              <input
                id="trim"
                name="trim"
                aria-label={trims.length ? "Escribe la versión" : undefined}
                defaultValue={values.trimId ? "" : values.trim}
                placeholder="Ej. LE, Limited, Sport"
                autoFocus={trims.length > 0 && trimChoice === OTHER_TRIM && !values.trim}
                className={cn(input, trims.length > 0 && "mt-2")}
              />
            )}
          </Field>
          <Field label="Tipo de carrocería" id="bodyType">
            <select id="bodyType" name="bodyType" value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)} className={input}>
              {BODY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Año" id="year">
            <select id="year" name="year" defaultValue={values.year} className={input}>
              {Array.from({ length: thisYear + 2 - 1960 }, (_, i) => thisYear + 1 - i).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Field>
          <fieldset>
            <legend className={label}>Condición</legend>
            <div className="grid h-11 grid-cols-2 rounded-lg border border-line bg-surface p-1">
              {(["NEW", "USED"] as const).map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="condition" value={c} checked={condition === c} onChange={() => setCondition(c)} className="peer sr-only" />
                  <span className="grid h-full place-items-center rounded-md text-sm font-semibold text-muted peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    {c === "NEW" ? "Nuevo" : "Usado"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      <Section title="Precio y kilometraje">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem_1fr]">
          <Field label="Precio" id="price">
            <input id="price" name="price" type="number" min={1000} step={1000} inputMode="numeric" required defaultValue={values.price} className={input} />
          </Field>
          <Field label="Moneda" id="currency">
            <select id="currency" name="currency" defaultValue={values.currency} className={input}>
              <option value="DOP">RD$</option>
              <option value="USD">US$</option>
            </select>
          </Field>
          <Field label="Kilometraje (km)" id="mileageKm">
            <input id="mileageKm" name="mileageKm" type="number" min={0} step={1} inputMode="numeric" required defaultValue={condition === "NEW" ? 0 : values.mileageKm} key={condition} className={input} />
          </Field>
        </div>
      </Section>

      <Section title="Ficha técnica">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField id="transmission" label="Transmisión" options={TRANSMISSION_LABEL} value={values.transmission} />
          <SelectField id="fuel" label="Combustible" options={FUEL_LABEL} value={values.fuel} />
          <SelectField id="drivetrain" label="Tracción" options={DRIVETRAIN_LABEL} value={values.drivetrain} />
          <Field label="Motor" id="engine">
            <input id="engine" name="engine" defaultValue={values.engine} placeholder="Ej. 2.5L 4 cil." className={input} />
          </Field>
          <Field label="Color exterior" id="extColor">
            <input id="extColor" name="extColor" list="colors" defaultValue={values.extColor} className={input} />
          </Field>
          <Field label="Color interior" id="intColor">
            <input id="intColor" name="intColor" list="colors" defaultValue={values.intColor} className={input} />
          </Field>
          <datalist id="colors">
            {COLORS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field label="Puertas" id="doors">
            <input id="doors" name="doors" type="number" min={1} max={6} defaultValue={values.doors} className={input} />
          </Field>
          <Field label="Pasajeros" id="seats">
            <input id="seats" name="seats" type="number" min={1} max={20} defaultValue={values.seats} className={input} />
          </Field>
        </div>
        <Field label="Descripción" id="description" className="mt-4">
          <textarea id="description" name="description" rows={5} maxLength={4000} defaultValue={values.description} placeholder="Estado, mantenimientos, financiamiento, garantía…" className={cn(input, "h-auto py-2.5")} />
        </Field>
      </Section>

      <Section title="Características y facilidades">
        <div className="space-y-5">
          {(Object.keys(FEATURE_CATEGORY_LABEL) as FeatureCategory[]).map((cat) => (
            <fieldset key={cat}>
              <legend className="wide mb-2 text-sm font-bold">{FEATURE_CATEGORY_LABEL[cat]}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {features
                  .filter((f) => f.category === cat)
                  .map((f) => (
                    <label key={f.slug} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/8">
                      <input type="checkbox" name="features" value={f.slug} defaultChecked={values.features.includes(f.slug)} className="size-4 accent-[var(--brand)]" />
                      <FeatureIcon icon={f.icon} className="size-4 text-brand" />
                      {f.name}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Section>

      <Section title="Ubicación" text="Dónde se puede ver el vehículo. Aparece en el mapa del portal.">
        <Field label="Provincia" id="province" className="mb-4 max-w-sm">
          <select id="province" name="province" defaultValue={values.province} required className={input}>
            {provinces.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <LocationPicker defaultLat={values.lat} defaultLng={values.lng} />
      </Section>

      <div className={cn(card, "sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 p-4 shadow-xl")}>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={values.featured} className="size-5 accent-[var(--accent)]" />
          <span>
            <span className="font-semibold">Destacar en la portada</span>
            <span className="block text-muted">{featuredHint}</span>
          </span>
        </label>
        <div className="flex gap-2">
          <button type="submit" name="intent" value="draft" disabled={pending} className={button("outline")}>
            Guardar borrador
          </button>
          <button type="submit" name="intent" value="publish" disabled={pending} className={button("primary")}>
            {pending ? "Guardando…" : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className={cn(card, "p-5 sm:p-6")}>
      <h2 className="wide text-lg font-bold">{title}</h2>
      {text && <p className="mt-0.5 text-sm text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label: text, id, className, children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
    </div>
  );
}

function SelectField({ id, label: text, options, value }: { id: string; label: string; options: Record<string, string>; value: string }) {
  return (
    <Field label={text} id={id}>
      <select id={id} name={id} defaultValue={value} className={input}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}
