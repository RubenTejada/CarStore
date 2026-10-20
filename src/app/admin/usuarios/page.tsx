import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toggleUserActive } from "@/app/actions/admin";
import { ROLE_LABEL } from "@/lib/labels";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { button, card } from "@/components/ui/styles";

export default async function AdminUsers() {
  const me = await requireUser("ADMIN");
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "desc" }], include: { dealer: { select: { name: true } }, _count: { select: { vehicles: true } } } });
  return (
    <>
      <PageTitle title="Usuarios" text={`${users.length} cuentas`} />
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              {["Nombre", "Correo", "Tipo", "Dealer", "Vehículos", ""].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-55"}>
                <td className="px-5 py-3 font-semibold">{u.name}</td>
                <td className="px-5 py-3">{u.email}</td>
                <td className="px-5 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-5 py-3">{u.dealer?.name ?? "—"}</td>
                <td className="px-5 py-3">{u._count.vehicles}</td>
                <td className="px-5 py-3 text-right">
                  {u.id !== me.id && (
                    <ActionButton action={toggleUserActive.bind(null, u.id)} className={button(u.active ? "danger" : "brand", "sm")}>
                      {u.active ? "Desactivar" : "Activar"}
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
