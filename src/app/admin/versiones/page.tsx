import { ChevronDown, Plus, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createTrim, deleteTrim, promoteTrim } from "@/app/actions/admin";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { SimpleForm } from "@/components/forms/simple-form";
import { card, input, label } from "@/components/ui/styles";

export const metadata = { title: "Versiones" };

export default async function Trims() {
  await requireUser("ADMIN");
  const [brands, loose] = await Promise.all([
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        models: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, trims: { orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { vehicles: true } } } } },
        },
      },
    }),
    // Versiones escritas a mano que no están en el catálogo, las más repetidas primero.
    db.vehicle.groupBy({
      by: ["modelId", "trim"],
      where: { trimId: null, trim: { not: null } },
      _count: true,
      orderBy: [{ _count: { trim: "desc" } }, { trim: "asc" }],
      take: 50,
    }),
  ]);
  const modelName = new Map(brands.flatMap((b) => b.models.map((m) => [m.id, `${b.name} ${m.name}`])));
  const total = brands.reduce((n, b) => n + b.models.reduce((x, m) => x + m.trims.length, 0), 0);

  return (
    <>
      <PageTitle title="Versiones" text={`${total} versiones en el catálogo`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={`${card} p-6`}>
          <h2 className="wide mb-4 font-bold">Nueva versión</h2>
          <SimpleForm action={createTrim} submit="Crear versión">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="t-model" className={label}>
                  Modelo
                </label>
                <select id="t-model" name="modelId" required className={input}>
                  <option value="">Selecciona el modelo</option>
                  {brands.map((b) => (
                    <optgroup key={b.id} label={b.name}>
                      {b.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {b.name} {m.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="t-name" className={label}>
                  Versión
                </label>
                <input id="t-name" name="name" required maxLength={60} placeholder="SX Prestige" className={input} />
              </div>
            </div>
            <p className="text-sm text-muted">Las publicaciones del modelo que ya tenían esta versión escrita a mano quedan enlazadas.</p>
          </SimpleForm>
        </section>
        <section className={`${card} p-6`}>
          <h2 className="wide font-bold">Escritas por vendedores</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">Versiones que no están en el catálogo. Al agregarlas, sus publicaciones aparecen en el filtro por versión.</p>
          {loose.length === 0 ? (
            <p className="text-sm text-muted">No hay versiones pendientes.</p>
          ) : (
            <ul className="divide-y divide-line">
              {loose.map((t) => (
                <li key={`${t.modelId}/${t.trim}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="text-muted">{modelName.get(t.modelId)}</span> <span className="font-semibold">{t.trim}</span>{" "}
                    <span className="text-xs text-muted">({t._count})</span>
                  </span>
                  <ActionButton action={promoteTrim.bind(null, t.modelId, t.trim!)} className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1 font-semibold hover:border-brand hover:text-brand">
                    <Plus className="size-3.5" aria-hidden />
                    Agregar al catálogo
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="mt-8 space-y-3">
        {brands.map((b) => {
          const count = b.models.reduce((n, m) => n + m.trims.length, 0);
          return (
            <details key={b.id} className={`${card} group`}>
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
                <span className="wide font-bold">{b.name}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  {count} versiones
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                </span>
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {b.models.map((m) => (
                  <li key={m.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[10rem_1fr]">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <ul className="flex flex-wrap gap-1.5">
                      {m.trims.length === 0 && <li className="text-sm text-muted">Sin versiones</li>}
                      {m.trims.map((t) => (
                        <li key={t.id} className="flex items-center gap-1 rounded-full border border-line py-1 pr-1 pl-3 text-sm">
                          {t.name}
                          <span className="text-xs text-muted">({t._count.vehicles})</span>
                          <ActionButton
                            action={deleteTrim.bind(null, t.id)}
                            confirm={`¿Eliminar la versión ${t.name} de ${b.name} ${m.name}?${t._count.vehicles ? " Las publicaciones conservan el texto de la versión." : ""}`}
                            className="grid size-6 place-items-center rounded-full hover:bg-accent/10 hover:text-accent"
                          >
                            <X className="size-3.5" aria-label={`Eliminar ${t.name}`} />
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </>
  );
}
