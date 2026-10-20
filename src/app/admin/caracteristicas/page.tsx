import { X } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createFeature, deleteFeature } from "@/app/actions/admin";
import { FEATURE_CATEGORY_LABEL } from "@/lib/labels";
import { FEATURE_ICON_KEYS, FeatureIcon } from "@/lib/feature-icons";
import type { FeatureCategory } from "@/generated/prisma/enums";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { SimpleForm } from "@/components/forms/simple-form";
import { card, input, label } from "@/components/ui/styles";

export default async function Features() {
  await requireUser("ADMIN");
  const features = await db.feature.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { vehicles: true } } } });
  return (
    <>
      <PageTitle title="Características" text="Facilidades que los vendedores marcan en cada vehículo y que se usan como filtros." />
      <section className={`${card} p-6`}>
        <h2 className="wide mb-4 font-bold">Nueva característica</h2>
        <SimpleForm action={createFeature} submit="Crear característica">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="f-name" className={label}>
                Nombre
              </label>
              <input id="f-name" name="name" required className={input} />
            </div>
            <div>
              <label htmlFor="f-cat" className={label}>
                Categoría
              </label>
              <select id="f-cat" name="category" className={input}>
                {Object.entries(FEATURE_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={label}>Ícono</legend>
              <div className="flex flex-wrap gap-1">
                {FEATURE_ICON_KEYS.map((k, i) => (
                  <label key={k} className="cursor-pointer" title={k}>
                    <input type="radio" name="icon" value={k} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="grid size-8 place-items-center rounded-md border border-line peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      <FeatureIcon icon={k} className="size-4" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </SimpleForm>
      </section>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(Object.keys(FEATURE_CATEGORY_LABEL) as FeatureCategory[]).map((cat) => (
          <section key={cat} className={`${card} p-5`}>
            <h2 className="wide font-bold">{FEATURE_CATEGORY_LABEL[cat]}</h2>
            <ul className="mt-3 divide-y divide-line">
              {features
                .filter((f) => f.category === cat)
                .map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                    <FeatureIcon icon={f.icon} className="size-4 text-brand" />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-muted">{f._count.vehicles} vehículos</span>
                    <ActionButton action={deleteFeature.bind(null, f.id)} confirm={`¿Eliminar "${f.name}"? Se quitará de ${f._count.vehicles} vehículos.`} className="grid size-7 place-items-center rounded-md hover:bg-accent/10 hover:text-accent">
                      <X className="size-4" aria-label={`Eliminar ${f.name}`} />
                    </ActionButton>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
