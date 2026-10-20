import Link from "next/link";
import { Eye, Star, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountScope, getQuota } from "@/lib/listing-rules";
import { VEHICLE_STATUS_LABEL } from "@/lib/labels";
import { vehicleTitle } from "@/lib/urls";
import { PageTitle } from "@/components/panel/shell";
import { button, card } from "@/components/ui/styles";

export default async function PanelHome() {
  const user = await requireUser("DEALER", "SELLER");
  const scope = accountScope(user);
  const [quota, byStatus, views, recent, pending] = await Promise.all([
    getQuota(user),
    db.vehicle.groupBy({ by: ["status"], where: scope, _count: true }),
    db.vehicle.aggregate({ where: scope, _sum: { views: true } }),
    db.vehicle.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 5, include: { model: { include: { brand: true } } } }),
    db.subscription.count({ where: { ...(user.dealerId ? { dealerId: user.dealerId } : { userId: user.id, dealerId: null }), status: "PENDING" } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

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
      {!quota.planName && (
        <Alert>
          {pending ? "Tu solicitud de plan está pendiente de aprobación del pago." : "No tienes un plan activo. "}
          {!pending && (
            <Link href="/panel/planes" className="font-semibold underline">
              Elige un plan para publicar
            </Link>
          )}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Publicados" value={`${quota.usedActive} / ${quota.maxActive}`} hint={quota.planName ? `Plan ${quota.planName}` : "Sin plan"} />
        <Stat label="Destacados" value={`${quota.usedFeatured} / ${quota.featuredSlots}`} hint="En la portada" icon={<Star className="size-5 text-sun" aria-hidden />} />
        <Stat label="Visitas totales" value={(views._sum.views ?? 0).toLocaleString("es-DO")} hint="Todas tus publicaciones" icon={<Eye className="size-5 text-brand" aria-hidden />} />
        <Stat
          label="Plan vence"
          value={quota.endsAt ? quota.endsAt.toLocaleDateString("es-DO", { day: "numeric", month: "short" }) : "—"}
          hint={`${count("DRAFT")} borradores, ${count("PAUSED")} pausados, ${count("SOLD")} vendidos`}
        />
      </div>

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
