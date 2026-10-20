import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { approveSubscription, rejectSubscription } from "@/app/actions/admin";
import { SUBSCRIPTION_STATUS_LABEL, formatPrice } from "@/lib/labels";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { button, card } from "@/components/ui/styles";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function Subscriptions() {
  await requireUser("ADMIN");
  const subs = await db.subscription.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { plan: true, user: { select: { name: true, email: true } }, dealer: { select: { name: true } } },
  });
  const pending = subs.filter((s) => s.status === "PENDING");
  return (
    <>
      <PageTitle title="Pagos y planes" text="Confirma las transferencias para activar los planes." />
      <section className={`${card} overflow-x-auto`}>
        <h2 className="wide border-b border-line p-5 font-bold">Por confirmar ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="p-5 text-muted">No hay pagos pendientes.</p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {s.dealer?.name ?? s.user.name} <span className="font-normal text-muted">({s.user.email})</span>
                  </p>
                  <p className="text-sm text-muted">
                    Plan {s.plan.name}, {formatPrice(s.plan.priceDop, "DOP")}, referencia <span className="font-semibold text-ink">{s.paymentRef}</span>, solicitado el {fmt(s.createdAt)}
                  </p>
                </div>
                <ActionButton action={approveSubscription.bind(null, s.id)} className={button("brand", "sm")}>
                  Confirmar pago y activar
                </ActionButton>
                <ActionButton action={rejectSubscription.bind(null, s.id)} confirm="¿Rechazar esta solicitud?" className={button("danger", "sm")}>
                  Rechazar
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={`${card} mt-8 overflow-x-auto`}>
        <h2 className="wide border-b border-line p-5 font-bold">Historial</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              {["Cliente", "Plan", "Referencia", "Vigencia", "Estado"].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {subs
              .filter((s) => s.status !== "PENDING")
              .map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold">{s.dealer?.name ?? s.user.name}</td>
                  <td className="px-5 py-3">{s.plan.name}</td>
                  <td className="px-5 py-3">{s.paymentRef ?? "—"}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {fmt(s.startsAt)} – {fmt(s.endsAt)}
                  </td>
                  <td className="px-5 py-3">{SUBSCRIPTION_STATUS_LABEL[s.status]}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
