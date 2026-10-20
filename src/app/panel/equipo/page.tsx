import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { removeTeamMember } from "@/app/actions/dealer";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { TeamForm } from "@/components/forms/team-form";
import { button, card } from "@/components/ui/styles";

export default async function Team() {
  const user = await requireUser("DEALER");
  const members = await db.user.findMany({ where: { dealerId: user.dealerId! }, orderBy: { createdAt: "asc" }, include: { _count: { select: { vehicles: true } } } });
  return (
    <div className="max-w-4xl">
      <PageTitle title="Equipo" text="Usuarios que pueden administrar el inventario del dealer." />
      <ul className={`${card} divide-y divide-line`}>
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span>
              <span className="font-semibold">{m.name}</span>
              {m.id === user.id && <span className="ml-2 text-sm text-muted">(tú)</span>}
              <span className="block text-sm text-muted">
                {m.email}, {m._count.vehicles} vehículos
              </span>
            </span>
            {m.id !== user.id && (
              <ActionButton action={removeTeamMember.bind(null, m.id)} confirm={`¿Eliminar a ${m.name}? Sus vehículos pasan a tu cuenta.`} className={button("danger", "sm")}>
                Eliminar
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
      <section className={`${card} mt-8 p-6`}>
        <h2 className="wide mb-4 text-lg font-bold">Agregar usuario</h2>
        <TeamForm />
      </section>
    </div>
  );
}
