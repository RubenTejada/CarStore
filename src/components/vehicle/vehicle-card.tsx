import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Gauge, MapPin, Rotate3d, Star, TrendingDown } from "lucide-react";
import type { VehicleCard as Vehicle } from "@/lib/search";
import { CONDITION_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice, toUsd } from "@/lib/labels";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { cn } from "@/lib/cn";
import { priceDrop } from "@/lib/price-drop";
import { CompareToggle } from "@/components/compare/compare-toggle";
import { FavoriteToggle } from "@/components/saved/favorite-toggle";
import { SpinViewer } from "./spin-viewer";

const cardSizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw";

/**
 * Con `spin`, si el vehículo tiene giro 360 se muestra girando en lugar de la foto de portada.
 * Con `usdRate` (buscador en US$) los precios en pesos muestran su equivalente en dólares; sin él,
 * los precios en dólares muestran su equivalente en pesos.
 */
export function VehicleCard({
  v,
  priority = false,
  spin = false,
  usdRate,
  className,
}: {
  v: Vehicle;
  priority?: boolean;
  spin?: boolean;
  usdRate?: number;
  className?: string;
}) {
  const photo = v.photos[0]?.url;
  const featured = v.featuredUntil && new Date(v.featuredUntil) > new Date();
  const spinning = spin && v.spinFrames.length > 0;
  const has360 = v.spinFrames.length > 0 || !!v.interiorPano;
  const drop = priceDrop(v);
  const approx = usdRate ? v.currency === "DOP" && formatPrice(toUsd(v.priceDop, usdRate), "USD") : v.currency === "USD" && formatPrice(v.priceDop, "DOP");
  // Guardar y comparar van fuera del enlace (no se anidan controles) y se superponen a la foto.
  return (
    <div className={cn("relative", className)}>
      <Link
        href={vehicleUrl(v)}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-ink/40 hover:shadow-[0_10px_30px_-12px_rgba(11,26,54,0.35)]"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
          {spinning ? (
            <SpinViewer frames={v.spinFrames} video={v.spinVideo} alt={`${vehicleTitle(v)} ${v.year}`} priority={priority} sizes={cardSizes} className="absolute inset-0" />
          ) : (
            photo && (
              <Image
                src={photo}
                alt={`${vehicleTitle(v)} ${v.year}`}
                fill
                priority={priority}
                sizes={cardSizes}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )
          )}
          {has360 && (
            <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-md bg-night/80 px-2 py-0.5 text-xs font-bold text-white">
              <Rotate3d className="size-3.5" aria-hidden />
              360°
            </span>
          )}
          <span className="plate absolute bottom-2.5 left-2.5 text-sm">{v.year}</span>
          <span className="absolute top-2.5 left-2.5 flex gap-1.5">
            {featured && (
              <span className="flex items-center gap-1 rounded-md bg-sun px-2 py-0.5 text-xs font-bold text-night">
                <Star className="size-3 fill-current" aria-hidden />
                Destacado
              </span>
            )}
            {drop && (
              <span className="flex items-center gap-1 rounded-md bg-ok px-2 py-0.5 text-xs font-bold text-surface">
                <TrendingDown className="size-3" aria-hidden />
                Bajó de precio
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
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-extrabold tracking-tight text-brand">{formatPrice(v.price, v.currency)}</span>
            {approx && <span className="text-sm text-muted">≈ {approx}</span>}
            {drop && (
              <s className="text-sm text-muted">
                <span className="sr-only">Antes </span>
                {formatPrice(v.price + drop, v.currency)}
              </s>
            )}
          </p>
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
      <div className="absolute top-2.5 right-2.5 flex gap-1.5">
        <FavoriteToggle id={v.id} title={`${vehicleTitle(v)} ${v.year}`} />
        <CompareToggle item={{ id: v.id, title: vehicleTitle(v), year: v.year, photo }} />
      </div>
    </div>
  );
}
