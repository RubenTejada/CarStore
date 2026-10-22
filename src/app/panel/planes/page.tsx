import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getQuota } from "@/lib/listing-rules";
import { SUBSCRIPTION_STATUS_LABEL, formatPrice } from "@/lib/labels";
import { PageTitle } from "@/components/panel/shell";
import { PlanRequestForm } from "@/components/forms/plan-request-form";
import { card } from "@/components/ui/styles";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function MyPlan() {
  const user = await requireUser("DEALER", "SELLER");
  const scope = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null };
  const [quota, subs, plans] = await Promise.all([
    getQuota(user),
    db.subscription.findMany({ where: scope, include: { plan: true }, orderBy: { createdAt: "desc" } }),
    db.plan.findMany({ where: { active: true, forDealers: !!user.dealerId }, orderBy: { priceDop: "asc" } }),
  ]);
  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Mi plan"
        text={
          quota.endsAt
            ? `Plan ${quota.planName} activo hasta el ${fmt(quota.endsAt)}`
            : `Estás en el plan ${quota.planName}: publica hasta ${quota.maxActive} vehículos sin costo.`
        }
      />
      <section className={`${card} p-6`}>
        <h2 className="wide mb-4 text-lg font-bold">{quota.endsAt ? "Renovar o mejorar" : "Mejorar mi plan"}</h2>
        <PlanRequestForm plans={plans} />
      </section>
      {subs.length > 0 && (
        <section className={`${card} mt-8 overflow-x-auto`}>
          <h2 className="wide border-b border-line p-5 text-lg font-bold">Historial</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Monto</th>
                <th className="px-5 py-3 font-medium">Referencia</th>
                <th className="px-5 py-3 font-medium">Vigencia</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold">{s.plan.name}</td>
                  <td className="px-5 py-3">{formatPrice(s.plan.priceDop, "DOP")}</td>
                  <td className="px-5 py-3">{s.paymentRef ?? "—"}</td>
                  <td className="px-5 py-3">
                    {fmt(s.startsAt)} – {fmt(s.endsAt)}
                  </td>
                  <td className="px-5 py-3">{SUBSCRIPTION_STATUS_LABEL[s.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
