import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil, Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountScope } from "@/lib/listing-rules";
import { VEHICLE_STATUS_LABEL, formatPrice } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { deleteVehicle, setVehicleStatus, toggleFeatured } from "@/app/actions/vehicles";
import { PageTitle } from "@/components/panel/shell";
import { VehicleRowActions } from "@/components/panel/vehicle-row-actions";
import { button, card } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

const STATUS_STYLE = {
  ACTIVE: "bg-ok/15 text-ok",
  DRAFT: "bg-surface-2 text-muted",
  PAUSED: "bg-sun/20 text-ink",
  SOLD: "bg-brand/15 text-brand",
} as const;

export default async function MyVehicles({ searchParams }: PageProps<"/panel/vehiculos">) {
  const user = await requireUser("DEALER", "SELLER");
  const { ok } = await searchParams;
  const vehicles = await db.vehicle.findMany({
    where: accountScope(user),
    orderBy: { updatedAt: "desc" },
    include: { model: { include: { brand: true } }, photos: { take: 1, orderBy: { position: "asc" } } },
  });

  return (
    <>
      <PageTitle
        title="Mis vehículos"
        text={`${vehicles.length} en total`}
        action={
          <Link href="/panel/vehiculos/nuevo" className={button("primary")}>
            Publicar vehículo
          </Link>
        }
      />
      {ok && (
        <p role="status" className="mb-6 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          {ok === "publicado" ? "Vehículo publicado." : "Borrador guardado."}
        </p>
      )}
      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center">
          <p className="display text-2xl">Todavía no tienes vehículos</p>
          <p className="mt-2 text-muted">Agrega fotos, características y la ubicación en el mapa.</p>
          <Link href="/panel/vehiculos/nuevo" className={cn(button("primary"), "mt-6")}>
            Publicar mi primer vehículo
          </Link>
        </div>
      ) : (
        <ul className={`${card} divide-y divide-line`}>
          {vehicles.map((v) => {
            const featured = !!v.featuredUntil && v.featuredUntil > new Date();
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {v.photos[0] && <Image src={v.photos[0].url} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {vehicleTitle(v)} {v.year} {v.trim && <span className="font-normal text-muted">{v.trim}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {formatPrice(v.price, v.currency)}
                    <span className="mx-2">|</span>
                    <Eye className="inline size-3.5" aria-hidden /> {v.views}
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_STYLE[v.status])}>{VEHICLE_STATUS_LABEL[v.status]}</span>
                {featured && (
                  <span className="flex items-center gap-1 rounded-full bg-sun px-3 py-1 text-xs font-bold text-night">
                    <Star className="size-3 fill-current" aria-hidden /> Destacado
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/panel/vehiculos/${v.id}`} className={button("outline", "sm")}>
                    <Pencil className="size-3.5" aria-hidden />
                    Editar
                  </Link>
                  {v.status === "ACTIVE" && (
                    <Link href={vehicleUrl(v)} className={button("ghost", "sm")}>
                      Ver
                    </Link>
                  )}
                  <VehicleRowActions
                    status={v.status}
                    featured={featured}
                    actions={{
                      publish: setVehicleStatus.bind(null, v.id, "ACTIVE"),
                      pause: setVehicleStatus.bind(null, v.id, "PAUSED"),
                      sold: setVehicleStatus.bind(null, v.id, "SOLD"),
                      feature: toggleFeatured.bind(null, v.id),
                      remove: deleteVehicle.bind(null, v.id),
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

