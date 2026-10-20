import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteVehicle, setVehicleStatus, toggleFeatured } from "@/app/actions/vehicles";
import { VEHICLE_STATUS_LABEL, formatPrice } from "@/lib/labels";
import { buildOrderBy, parseSearchParams } from "@/lib/search-params";
import { VehicleStatus } from "@/generated/prisma/enums";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { PageTitle } from "@/components/panel/shell";
import { VehicleRowActions } from "@/components/panel/vehicle-row-actions";
import { SortSelect } from "@/components/browse/sort-select";
import { button, card, input } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

export default async function AdminVehicles({ searchParams }: PageProps<"/admin/vehiculos">) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const status = Object.values(VehicleStatus).find((s) => s === sp.estado);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const { orden } = parseSearchParams({ orden: sp.orden });
  const vehicles = await db.vehicle.findMany({
    where: {
      status,
      ...(q && {
        OR: [
          { model: { name: { contains: q, mode: "insensitive" } } },
          { model: { brand: { name: { contains: q, mode: "insensitive" } } } },
          { dealer: { name: { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }),
    },
    orderBy: buildOrderBy(orden),
    take: 100,
    include: { model: { include: { brand: true } }, dealer: { select: { name: true } }, owner: { select: { name: true } }, photos: { take: 1, orderBy: { position: "asc" } } },
  });
  return (
    <>
      <PageTitle title="Vehículos" text="Moderación de publicaciones (máximo 100 por vista)." />
      <form method="get" className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Marca, modelo, dealer o correo" aria-label="Buscar" className={cn(input, "w-72")} />
        <select name="estado" defaultValue={status ?? ""} aria-label="Estado" className={cn(input, "w-44")}>
          <option value="">Todos los estados</option>
          {Object.values(VehicleStatus).map((s) => (
            <option key={s} value={s}>
              {VEHICLE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {orden && <input type="hidden" name="orden" value={orden} />}
        <button type="submit" className={button("brand")}>
          Filtrar
        </button>
        <div className="ml-auto">
          <SortSelect value={orden ?? "recientes"} />
        </div>
      </form>
      <ul className={`${card} divide-y divide-line`}>
        {vehicles.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-surface-2">{v.photos[0] && <Image src={v.photos[0].url} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <Link href={vehicleUrl(v)} className="font-bold hover:underline">
                {vehicleTitle(v)} {v.year}
              </Link>
              <p className="text-sm text-muted">
                {formatPrice(v.price, v.currency)}, {v.dealer?.name ?? `${v.owner.name} (particular)`}, {VEHICLE_STATUS_LABEL[v.status]}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link href={`/admin/vehiculos/${v.id}`} className={button("outline", "sm")}>
                Editar
              </Link>
              <VehicleRowActions
                status={v.status}
                featured={!!v.featuredUntil && v.featuredUntil > new Date()}
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
        ))}
      </ul>
    </>
  );
}
