import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, CircleDashed, CircleMinus, LoaderCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STALE_MS } from "@/lib/inventory-import";
import { resumeImportJob, startInventoryImport } from "@/app/actions/import";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { SimpleForm } from "@/components/forms/simple-form";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { button, card, input, label } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { ImportItemStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Importar inventario" };

const ITEM_ICON: Record<ImportItemStatus, React.ReactNode> = {
  PENDING: <CircleDashed className="size-4 text-muted" aria-label="En cola" />,
  RUNNING: <LoaderCircle className="size-4 animate-spin text-brand" aria-label="Importando" />,
  DONE: <CircleCheck className="size-4 text-ok" aria-label="Importado" />,
  SKIPPED: <CircleMinus className="size-4 text-muted" aria-label="Omitido" />,
  FAILED: <CircleAlert className="size-4 text-accent" aria-label="Con error" />,
};

export default async function ImportInventory() {
  const user = await requireUser("DEALER");
  if (!user.dealerId) notFound();
  const jobs = await db.importJob.findMany({
    where: { dealerId: user.dealerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { items: { orderBy: { id: "asc" } } },
  });
  const now = new Date();
  const isActive = (j: (typeof jobs)[number]) => j.status === "DISCOVERING" || j.status === "RUNNING";
  const isStale = (j: (typeof jobs)[number]) => isActive(j) && now.getTime() - j.updatedAt.getTime() > STALE_MS;

  return (
    <div className="max-w-4xl">
      <PageTitle title="Importar inventario" text="Trae los vehículos que ya publicas en otro portal: datos, características, precios y fotos." />
      {jobs.some((j) => isActive(j) && !isStale(j)) && <AutoRefresh />}

      <section className={cn(card, "p-5 sm:p-6")}>
        <h2 className="wide text-lg font-bold">Página de tu dealer en otro portal</h2>
        <p className="mt-0.5 text-sm text-muted">
          Pega el enlace de la página donde aparece todo tu inventario en cualquier portal de venta de vehículos o en tu web. Cada vehículo se crea como <strong>borrador</strong>: revísalo y publícalo
          desde «Mis vehículos». Los que ya importaste antes se omiten.
        </p>
        <SimpleForm action={startInventoryImport} submit="Importar inventario" className="mt-5">
          <div>
            <label htmlFor="url" className={label}>
              Enlace del inventario
            </label>
            <input id="url" name="url" type="url" required inputMode="url" placeholder="https://…" className={input} />
          </div>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="owner" required className="mt-0.5 size-4 accent-[var(--brand)]" />
            Confirmo que este inventario es de mi dealer.
          </label>
        </SimpleForm>
      </section>

      {jobs.map((job) => {
        const count = (s: ImportItemStatus) => job.items.filter((i) => i.status === s).length;
        const finished = count("DONE") + count("SKIPPED") + count("FAILED");
        return (
          <section key={job.id} className={cn(card, "mt-6 p-5 sm:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted">{job.url}</p>
                <p className="mt-1 font-bold">
                  {job.status === "DISCOVERING" && "Buscando los anuncios del inventario…"}
                  {job.status === "RUNNING" && `Importando: ${finished} de ${job.items.length}`}
                  {job.status === "DONE" && `Terminado: ${count("DONE")} importados, ${count("SKIPPED")} omitidos, ${count("FAILED")} con error`}
                  {job.status === "FAILED" && "No se pudo importar"}
                </p>
                {job.error && <p className="mt-1 text-sm text-accent">{job.error}</p>}
                <p className="mt-1 text-xs text-muted">{job.createdAt.toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" })}</p>
              </div>
              {isStale(job) && (
                <ActionButton action={resumeImportJob.bind(null, job.id)} className={button("outline", "sm")}>
                  Reanudar
                </ActionButton>
              )}
            </div>
            {job.status === "RUNNING" && job.items.length > 0 && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={job.items.length} aria-valuenow={finished}>
                <div className="h-full bg-brand transition-all" style={{ width: `${(finished / job.items.length) * 100}%` }} />
              </div>
            )}
            {job.items.length > 0 && (
              <ul className="mt-4 divide-y divide-line text-sm">
                {job.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-2">
                    <span className="mt-0.5 shrink-0">{ITEM_ICON[item.status]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {item.vehicleId ? (
                          <Link href={`/panel/vehiculos/${item.vehicleId}`} className="font-medium hover:underline">
                            {item.title ?? item.url}
                          </Link>
                        ) : (
                          (item.title ?? <span className="text-muted">{item.url}</span>)
                        )}
                      </p>
                      {item.error && <p className={item.status === "FAILED" ? "text-accent" : "text-muted"}>{item.error}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
