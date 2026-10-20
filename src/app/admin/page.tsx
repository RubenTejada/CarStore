import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/panel/shell";
import { card } from "@/components/ui/styles";

export default async function AdminHome() {
  await requireUser("ADMIN");
  const [active, total, dealersPending, subsPending, users, revenue] = await Promise.all([
    db.vehicle.count({ where: { status: "ACTIVE" } }),
    db.vehicle.count(),
    db.dealer.count({ where: { status: "PENDING" } }),
    db.subscription.count({ where: { status: "PENDING" } }),
    db.user.count(),
    db.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: { select: { priceDop: true } } } }),
  ]);
  const stats = [
    { label: "Vehículos publicados", value: active, hint: `${total} en total`, href: "/admin/vehiculos" },
    { label: "Pagos por confirmar", value: subsPending, hint: "Solicitudes de plan", href: "/admin/suscripciones", alert: subsPending > 0 },
    { label: "Dealers por aprobar", value: dealersPending, hint: "Registros nuevos", href: "/admin/dealers?estado=PENDING", alert: dealersPending > 0 },
    { label: "Usuarios", value: users, hint: `RD$${revenue.reduce((a, s) => a + s.plan.priceDop, 0).toLocaleString("es-DO")} en planes activos`, href: "/admin/usuarios" },
  ];
  return (
    <>
      <PageTitle title="Resumen" text="Estado general del portal." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${card} p-5 transition-colors hover:border-ink/40 ${s.alert ? "border-accent/50" : ""}`}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`wide mt-2 text-3xl font-extrabold ${s.alert ? "text-accent" : ""}`}>{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.hint}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
