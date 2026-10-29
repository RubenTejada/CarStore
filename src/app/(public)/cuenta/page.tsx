import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, LogOut, MailWarning, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { PageHeader } from "@/components/layout/page-header";
import { SavedVehicles } from "@/components/saved/saved-vehicles";
import { AlertsToggle, DeleteSearchButton, ResendVerificationButton } from "@/components/saved/account-actions";
import { button, card } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const searches = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const seller = user.role === "DEALER" || user.role === "SELLER";

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        description={`${user.name} · ${user.email}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {seller && (
              <Link href="/panel" className={button("outline", "sm")}>
                Mi panel de vendedor
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className={cn(button("ghost", "sm"), "text-inherit hover:bg-white/10")}>
                <LogOut className="size-4" aria-hidden />
                Salir
              </button>
            </form>
          </div>
        }
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {!user.emailVerifiedAt && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sun/60 bg-sun/15 px-4 py-3 text-sm">
            <MailWarning className="size-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1">
              Confirma tu correo con el enlace que te enviamos a <strong>{user.email}</strong> para recibir alertas.
            </p>
            <ResendVerificationButton />
          </div>
        )}

        <section className={cn(card, "p-5 sm:p-6")} aria-labelledby="alerts-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="alerts-title" className="wide flex items-center gap-2 text-lg font-bold">
                <BellRing className="size-5 text-brand" aria-hidden />
                Alertas por correo
              </h2>
              <p className="mt-1 text-sm text-muted">
                {user.alertsEnabled
                  ? "Cada mañana te escribimos si hay vehículos nuevos en tus búsquedas o si bajó de precio alguno que guardaste."
                  : "Las alertas están en pausa: no te escribiremos hasta que las actives."}
              </p>
            </div>
            <AlertsToggle enabled={user.alertsEnabled} />
          </div>

          <h3 className="wide mt-6 font-bold">Búsquedas guardadas</h3>
          {searches.length ? (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {searches.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Search className="size-4 shrink-0 text-muted" aria-hidden />
                  <Link href={`/vehiculos?${s.query}`} className="min-w-0 flex-1 font-medium hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-xs text-muted">Desde el {s.createdAt.toLocaleDateString("es-DO", { day: "numeric", month: "short", timeZone: "America/Santo_Domingo" })}</span>
                  <DeleteSearchButton id={s.id} name={s.name} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Aún no tienes búsquedas guardadas. Filtra en{" "}
              <Link href="/vehiculos" className="font-semibold text-brand hover:underline">
                Vehículos
              </Link>{" "}
              y toca «Crear alerta».
            </p>
          )}
        </section>

        <section aria-labelledby="saved-title">
          <h2 id="saved-title" className="display text-2xl">
            Guardados
          </h2>
          <p className="mt-1 text-sm text-muted">Se sincronizan con tu cuenta en todos tus dispositivos. Te avisamos si alguno baja de precio.</p>
          <div className="mt-5">
            <SavedVehicles />
          </div>
        </section>
      </div>
    </>
  );
}
