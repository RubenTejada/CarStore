"use client";

import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { cn } from "@/lib/cn";
import { useRecent, useVehicleCards } from "./use-saved";

/** Franja con los últimos vehículos vistos en este navegador; no se muestra si no hay ninguno. */
export function RecentlyViewed({ exclude, className }: { exclude?: string; className?: string }) {
  const ids = useRecent().filter((id) => id !== exclude);
  const items = useVehicleCards(ids);
  if (!items?.length) return null;
  return (
    <section className={cn("mx-auto max-w-7xl px-4 sm:px-6", className)}>
      <h2 className="display text-2xl">Vistos recientemente</h2>
      <ul className="scrollbar-none -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items.map((v) => (
          <li key={v.id} className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[22%]">
            <VehicleCard v={v} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
