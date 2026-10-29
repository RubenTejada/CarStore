import Link from "next/link";
import { Eye, MessageCircle, Phone, Send, Star, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountScope, getQuota } from "@/lib/listing-rules";
import { VEHICLE_STATUS_LABEL } from "@/lib/labels";
import { vehicleTitle } from "@/lib/urls";
import { LEAD_DAYS, contactRate, dailyCounts, leadWindowStart } from "@/lib/leads";
import { LeadChart } from "@/components/panel/lead-chart";
import { PageTitle } from "@/components/panel/shell";
import { button, card } from "@/components/ui/styles";

export default async function PanelHome() {
  const user = await requireUser("DEALER", "SELLER");
  const scope = accountScope(user);
  const since = leadWindowStart();
  const [quota, byStatus, views, recent, pending, leads, totalLeads] = await Promise.all([
    getQuota(user),
    db.vehicle.groupBy({ by: ["status"], where: scope, _count: true }),
    db.vehicle.aggregate({ where: scope, _sum: { views: true } }),
    db.vehicle.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 5, include: { model: { include: { brand: true } } } }),
    db.subscription.count({ where: { ...(user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null }), status: "PENDING" } }),
    db.leadEvent.findMany({ where: { vehicle: scope, createdAt: { gte: since } }, select: { kind: true, createdAt: true, vehicleId: true } }),
    db.leadEvent.count({ where: { vehicle: scope } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

  // Anuncios con más contactos en el periodo.
  const perVehicle = new Map<string, number>();
  for (const l of leads) perVehicle.set(l.vehicleId, (perVehicle.get(l.vehicleId) ?? 0) + 1);
  const topIds = [...perVehicle].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const topVehicles = topIds.length
    ? await db.vehicle.findMany({ where: { id: { in: topIds } }, select: { id: true, year: true, views: true, model: { select: { name: true, brand: { select: { name: true } } } } } })
    : [];
  const top = topIds.flatMap((id) => topVehicles.find((v) => v.id === id) ?? []);
  const byKind = (kind: string) => leads.filter((l) => l.kind === kind).length;
  const rate = contactRate(totalLeads, views._sum.views ?? 0);

  return (
    <>
      <PageTitle
        title={`Hola, ${user.name.split(" ")[0]}`}
        text={user.dealer ? `Panel de ${user.dealer.name}` : "Tu panel de vendedor"}
        action={
          <Link href="/panel/vehiculos/nuevo" className={button("primary")}>
            Publicar vehículo
          </Link>
        }
      />

      {quota.dealerStatus === "PENDING" && (
        <Alert>Tu dealer está pendiente de aprobación. Puedes preparar vehículos como borrador mientras la administración lo revisa.</Alert>
      )}
      {quota.dealerStatus === "SUSPENDED" && <Alert>Tu dealer está suspendido. Contacta a la administración.</Alert>}
      {pending > 0 && <Alert>Tu solicitud de plan está pendiente de aprobación del pago.</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Publicados" value={`${quota.usedActive} / ${quota.maxActive}`} hint={`Plan ${quota.planName}`} />
        <Stat label="Destacados" value={`${quota.usedFeatured} / ${quota.featuredSlots}`} hint="En la portada" icon={<Star className="size-5 text-sun" aria-hidden />} />
        <Stat label="Visitas totales" value={(views._sum.views ?? 0).toLocaleString("es-DO")} hint="Todas tus publicaciones" icon={<Eye className="size-5 text-brand" aria-hidden />} />
        <Stat
          label="Plan vence"
          value={quota.endsAt ? quota.endsAt.toLocaleDateString("es-DO", { day: "numeric", month: "short" }) : "Nunca"}
          hint={`${count("DRAFT")} borradores, ${count("PAUSED")} pausados, ${count("SOLD")} vendidos`}
        />
      </div>

      <section className={`${card} mt-8`} aria-labelledby="leads-title">
        <div className="border-b border-line p-5">
          <h2 id="leads-title" className="wide font-bold">
            Contactos de los últimos {LEAD_DAYS} días
          </h2>
          <p className="text-sm text-muted">Veces que un visitante tocó «WhatsApp» o «Llamar», o te envió una solicitud desde tus anuncios.</p>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[14rem_1fr]">
          <div>
            <p className="wide text-4xl font-extrabold">{leads.length.toLocaleString("es-DO")}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <MessageCircle className="size-4 text-muted" aria-hidden />
              {byKind("WHATSAPP")} por WhatsApp
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Phone className="size-4 text-muted" aria-hidden />
              {byKind("CALL")} llamadas
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Send className="size-4 text-muted" aria-hidden />
              <Link href="/panel/solicitudes" className="hover:underline">
                {byKind("FORM")} solicitudes
              </Link>
            </p>
            {rate !== null && (
              <p className="mt-3 text-sm text-muted">
                <span className="font-semibold text-ink">{rate.toLocaleString("es-DO")}%</span> de las visitas terminan en contacto
              </p>
            )}
          </div>
          <LeadChart days={dailyCounts(leads.map((l) => l.createdAt))} />
        </div>
        {top.length > 0 && (
          <table className="w-full border-t border-line text-sm">
            <caption className="sr-only">Anuncios con más contactos</caption>
            <thead className="text-left text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Anuncios con más contactos
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Contactos
                </th>
                <th scope="col" className="hidden px-5 py-2.5 text-right font-medium sm:table-cell">
                  Visitas totales
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {top.map((v) => (
                <tr key={v.id}>
                  <td className="px-5 py-3">
                    <Link href={`/panel/vehiculos/${v.id}`} className="font-medium hover:underline">
                      {vehicleTitle(v)} {v.year}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{perVehicle.get(v.id)}</td>
                  <td className="hidden px-5 py-3 text-right text-muted tabular-nums sm:table-cell">{v.views.toLocaleString("es-DO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="wide font-bold">Actividad reciente</h2>
          <Link href="/panel/vehiculos" className="text-sm font-semibold text-brand hover:underline">
            Ver todos
          </Link>
        </div>
        {recent.length ? (
          <ul className="divide-y divide-line">
            {recent.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <Link href={`/panel/vehiculos/${v.id}`} className="font-medium hover:underline">
                  {vehicleTitle(v)} {v.year}
                </Link>
                <span className="text-sm text-muted">
                  {VEHICLE_STATUS_LABEL[v.status]}, {v.views} visitas
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-muted">Aún no tienes vehículos. Publica el primero.</p>
        )}
      </section>
    </>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 flex items-start gap-3 rounded-xl border border-sun/60 bg-sun/15 px-4 py-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon?: React.ReactNode }) {
  return (
    <div className={`${card} p-5`}>
      <p className="flex items-center justify-between text-sm text-muted">
        {label}
        {icon}
      </p>
      <p className="wide mt-2 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}
