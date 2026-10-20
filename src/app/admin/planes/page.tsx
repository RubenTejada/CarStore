import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { savePlan } from "@/app/actions/admin";
import { PageTitle } from "@/components/panel/shell";
import { SimpleForm } from "@/components/forms/simple-form";
import { card, input, label } from "@/components/ui/styles";

type Plan = { id: string; name: string; description: string | null; priceDop: number; maxActiveListings: number; featuredSlots: number; durationDays: number; forDealers: boolean; active: boolean };

export default async function AdminPlans() {
  await requireUser("ADMIN");
  const plans = await db.plan.findMany({ orderBy: [{ forDealers: "asc" }, { priceDop: "asc" }], include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } } });
  return (
    <>
      <PageTitle title="Planes" text="Precios y límites de publicación." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {plans.map((p) => (
          <section key={p.id} className={`${card} p-6`}>
            <h2 className="wide mb-1 font-bold">{p.name}</h2>
            <p className="mb-4 text-sm text-muted">{p._count.subscriptions} suscripciones activas</p>
            <PlanFields plan={p} />
          </section>
        ))}
        <section className={`${card} border-dashed p-6`}>
          <h2 className="wide mb-4 font-bold">Nuevo plan</h2>
          <PlanFields />
        </section>
      </div>
    </>
  );
}

function PlanFields({ plan }: { plan?: Plan }) {
  const id = plan?.id ?? "new";
  const num = (name: keyof Plan, text: string, min = 0) => (
    <div>
      <label htmlFor={`${id}-${name}`} className={label}>
        {text}
      </label>
      <input id={`${id}-${name}`} name={name} type="number" min={min} required defaultValue={plan ? String(plan[name]) : ""} className={input} />
    </div>
  );
  return (
    <SimpleForm action={savePlan.bind(null, plan?.id ?? null)} submit={plan ? "Guardar" : "Crear plan"} resetOnSuccess={!plan}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            Nombre
          </label>
          <input id={`${id}-name`} name="name" required defaultValue={plan?.name} className={input} />
        </div>
        {num("priceDop", "Precio (RD$)")}
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-description`} className={label}>
            Descripción
          </label>
          <input id={`${id}-description`} name="description" defaultValue={plan?.description ?? ""} className={input} />
        </div>
        {num("maxActiveListings", "Vehículos publicados", 1)}
        {num("featuredSlots", "Destacados")}
        {num("durationDays", "Duración (días)", 1)}
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="forDealers" defaultChecked={plan?.forDealers} className="size-4" /> Para dealers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} className="size-4" /> Disponible
          </label>
        </div>
      </div>
    </SimpleForm>
  );
}
