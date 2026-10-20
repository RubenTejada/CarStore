import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Gauge, MapPin, Star } from "lucide-react";
import type { VehicleCard as Vehicle } from "@/lib/search";
import { CONDITION_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { cn } from "@/lib/cn";
import { CompareToggle } from "@/components/compare/compare-toggle";

export function VehicleCard({ v, priority = false, className }: { v: Vehicle; priority?: boolean; className?: string }) {
  const photo = v.photos[0]?.url;
  const featured = v.featuredUntil && new Date(v.featuredUntil) > new Date();
  // El botón de comparar va fuera del enlace (no se anidan controles) y se superpone a la foto.
  return (
    <div className={cn("relative", className)}>
      <Link
        href={vehicleUrl(v)}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-ink/40 hover:shadow-[0_10px_30px_-12px_rgba(11,26,54,0.35)]"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
          {photo && (
            <Image
              src={photo}
              alt={`${vehicleTitle(v)} ${v.year}`}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <span className="plate absolute bottom-2.5 left-2.5 text-sm">{v.year}</span>
          <span className="absolute top-2.5 left-2.5 flex gap-1.5">
            {featured && (
              <span className="flex items-center gap-1 rounded-md bg-sun px-2 py-0.5 text-xs font-bold text-night">
                <Star className="size-3 fill-current" aria-hidden />
                Destacado
              </span>
            )}
            {v.condition === "NEW" && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white">{CONDITION_LABEL.NEW}</span>
            )}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="wide text-[17px] leading-tight font-bold">
            {vehicleTitle(v)}
            {v.trim && <span className="font-normal text-muted"> {v.trim}</span>}
          </h3>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-brand">{formatPrice(v.price, v.currency)}</p>
          <p className="mt-3 mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Gauge className="size-4" aria-hidden />
              {formatKm(v.mileageKm)}
            </span>
            <span>{TRANSMISSION_LABEL[v.transmission]}</span>
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {v.province}
            </span>
          </p>
          <p className="mt-auto flex items-center gap-1.5 border-t border-line pt-3 text-sm font-medium">
            {v.dealer ? (
              <>
                {v.dealer.name}
                {v.dealer.verified && <BadgeCheck className="size-4 text-brand" aria-label="Dealer verificado" />}
              </>
            ) : (
              <span className="text-muted">Vendedor particular</span>
            )}
          </p>
        </div>
      </Link>
      <CompareToggle item={{ id: v.id, title: vehicleTitle(v), year: v.year, photo }} className="absolute top-2.5 right-2.5" />
    </div>
  );
}
