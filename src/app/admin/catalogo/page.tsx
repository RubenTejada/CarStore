import { X } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getBrandLogo } from "@/lib/brand-logos";
import { createBrand, createModel, deleteModel } from "@/app/actions/admin";
import { BODY_TYPES, BODY_TYPE_LABEL } from "@/lib/labels";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { SimpleForm } from "@/components/forms/simple-form";
import { BrandLogo } from "@/components/browse/brand-logo";
import { card, input, label } from "@/components/ui/styles";

export default async function Catalog() {
  await requireUser("ADMIN");
  const brands = await db.brand.findMany({ orderBy: { name: "asc" }, include: { models: { orderBy: { name: "asc" }, include: { _count: { select: { vehicles: true } } } } } });
  return (
    <>
      <PageTitle title="Marcas y modelos" text={`${brands.length} marcas`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={`${card} p-6`}>
          <h2 className="wide mb-4 font-bold">Nueva marca</h2>
          <SimpleForm action={createBrand} submit="Crear marca">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="b-name" className={label}>
                  Nombre
                </label>
                <input id="b-name" name="name" required className={input} />
              </div>
              <div>
                <label htmlFor="b-icon" className={label}>
                  Ícono (simple-icons)
                </label>
                <input id="b-icon" name="iconSlug" placeholder="toyota" className={input} />
              </div>
              <div>
                <label htmlFor="b-color" className={label}>
                  Color
                </label>
                <input id="b-color" name="color" placeholder="EB0A1E" className={input} />
              </div>
            </div>
          </SimpleForm>
        </section>
        <section className={`${card} p-6`}>
          <h2 className="wide mb-4 font-bold">Nuevo modelo</h2>
          <SimpleForm action={createModel} submit="Crear modelo">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="m-brand" className={label}>
                  Marca
                </label>
                <select id="m-brand" name="brandId" required className={input}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="m-name" className={label}>
                  Modelo
                </label>
                <input id="m-name" name="name" required className={input} />
              </div>
              <div>
                <label htmlFor="m-type" className={label}>
                  Tipo
                </label>
                <select id="m-type" name="bodyType" className={input}>
                  {BODY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SimpleForm>
        </section>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {brands.map((b) => (
          <li key={b.id} className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <BrandLogo brand={{ name: b.name, color: b.color, logo: getBrandLogo(b.iconSlug) }} colored className="size-9" />
              <h3 className="wide font-bold">{b.name}</h3>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {b.models.map((m) => (
                <li key={m.id} className="flex items-center gap-1 rounded-full border border-line py-1 pr-1 pl-3 text-sm" title={BODY_TYPE_LABEL[m.bodyType]}>
                  {m.name}
                  <span className="text-xs text-muted">({m._count.vehicles})</span>
                  {m._count.vehicles === 0 ? (
                    <ActionButton action={deleteModel.bind(null, m.id)} confirm={`¿Eliminar el modelo ${m.name}?`} className="grid size-6 place-items-center rounded-full hover:bg-accent/10 hover:text-accent">
                      <X className="size-3.5" aria-label={`Eliminar ${m.name}`} />
                    </ActionButton>
                  ) : (
                    <span className="w-1" />
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
