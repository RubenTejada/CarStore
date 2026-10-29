"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { useSaved, useVehicleCards } from "./use-saved";

/** Lista de /guardados: los vehículos guardados en este navegador que siguen publicados. */
export function SavedVehicles() {
  const { ids, keepOnly } = useSaved();
  const items = useVehicleCards(ids);

  // Un vehículo vendido o pausado sale de la lista (y del contador de la cabecera).
  const stale = !!items && items.length < ids.length;
  useEffect(() => {
    if (stale && items) keepOnly(items.map((v) => v.id));
    // Solo cuando la respuesta trae menos de los guardados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  if (items === null) return <p className="text-muted">Cargando tus vehículos guardados…</p>;
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-line p-12 text-center">
        <Heart className="mx-auto size-8 text-muted" aria-hidden />
        <p className="display mt-3 text-2xl">Aún no has guardado vehículos</p>
        <p className="mt-2 text-muted">Toca el corazón de cualquier vehículo para tenerlo a mano aquí.</p>
        <Link href="/vehiculos" className="mt-5 inline-block font-semibold text-brand hover:underline">
          Explorar vehículos
        </Link>
      </div>
    );
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((v) => (
        <li key={v.id}>
          <VehicleCard v={v} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
