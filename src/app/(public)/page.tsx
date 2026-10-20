import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getBrowseCatalog } from "@/lib/catalog";
import { getFeaturedVehicles } from "@/lib/search";
import { formatPrice } from "@/lib/labels";
import { VehicleFinder } from "@/components/browse/vehicle-finder";
import { BrandTileBody, brandCell, brandGrid, brandTile } from "@/components/browse/brand-logo";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { MapView } from "@/components/map/map-view";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [brands, featured, dealers, totals, plans] = await Promise.all([
    getBrowseCatalog(),
    getFeaturedVehicles(10),
    db.dealer.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ verified: "desc" }, { name: "asc" }],
      include: { _count: { select: { vehicles: { where: { status: "ACTIVE" } } } } },
    }),
    db.vehicle.count({ where: { status: "ACTIVE" } }),
    db.plan.findMany({ where: { active: true }, orderBy: { priceDop: "asc" } }),
  ]);

  const brandCounts = new Map(brands.map((b) => [b.slug, b.models.reduce((a, m) => a + m.stock.reduce((x, r) => x + r.n, 0), 0)]));

  return (
    <>
      <section className="relative overflow-hidden bg-night">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-6 h-1 bg-[repeating-linear-gradient(90deg,rgba(245,183,0,0.55)_0_56px,transparent_56px_112px)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-16">
          <h1 className="display text-3xl text-white sm:text-4xl">
            ¿Qué vas a <span className="text-[#f5b700]">manejar</span>?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            {totals} vehículos de {dealers.length} dealers y particulares esperan por ti en toda la República Dominicana. Elige el tipo, la marca y el modelo.
          </p>
          <div className="mt-8">
            <VehicleFinder brands={brands} />
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 className="display text-3xl">Destacados</h2>
              <p className="mt-1 text-muted">Vehículos promocionados por dealers y vendedores con plan.</p>
            </div>
            <Link href="/planes" className="shrink-0 text-sm font-semibold text-brand hover:underline">
              Destaca tu vehículo
            </Link>
          </div>
          <ul className="scrollbar-none -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {featured.map((v, i) => (
              <li key={v.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[23.5%]">
                <VehicleCard v={v} priority={i < 2} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 className="display text-3xl">Marcas</h2>
        <ul className={cn("mt-6", brandGrid)}>
          {brands.map((b) => (
            <li key={b.slug} className={brandCell}>
              <Link href={`/vehiculos?marca=${b.slug}`} className={brandTile}>
                <BrandTileBody brand={b} count={brandCounts.get(b.slug) ?? 0} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="display text-3xl">Dealers en todo el país</h2>
            <p className="mt-1 text-muted">Ubica el dealer más cercano y mira su inventario.</p>
          </div>
          <Link href="/mapa" className="shrink-0 text-sm font-semibold text-brand hover:underline">
            Abrir el mapa
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {dealers.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link href={`/dealers/${d.slug}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
                  <DealerBadge dealer={d} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="truncate">{d.name}</span>
                      {d.verified && <BadgeCheck className="size-4 shrink-0 text-brand" aria-label="Verificado" />}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted">
                      <MapPin className="size-3.5" aria-hidden />
                      {d.province}
                    </span>
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap">{d._count.vehicles} vehículos</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dealers" className="block p-4 text-center text-sm font-semibold text-brand hover:bg-surface-2">
                Ver los {dealers.length} dealers
              </Link>
            </li>
          </ul>
          <MapView
            className="min-h-80"
            points={dealers.map((d) => ({
              id: d.id,
              lat: d.lat,
              lng: d.lng,
              kind: "dealer",
              title: d.name,
              subtitle: `${d.province}, ${d._count.vehicles} vehículos`,
              href: `/dealers/${d.slug}`,
              image: d.coverUrl,
            }))}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-brand text-brand-ink lg:grid-cols-[1.1fr_1fr]">
          <div className="p-8 sm:p-12">
            <h2 className="display text-3xl sm:text-4xl">Vende tu vehículo aquí</h2>
            <p className="mt-4 max-w-md opacity-80">
              Publica con fotos, características y ubicación en el mapa. Los dealers tienen perfil propio con su inventario completo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className={button("primary", "lg")}>
                Crear cuenta y publicar
              </Link>
              <Link href="/registro?tipo=dealer" className={cn(button("outline", "lg"), "border-current/30 bg-transparent text-current hover:border-current")}>
                Registrar mi dealer
              </Link>
            </div>
          </div>
          <ul className="grid content-center gap-2 bg-black/15 p-6 sm:p-10">
            {plans.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 rounded-lg bg-white/10 px-4 py-3">
                <span>
                  <span className="font-bold">{p.name}</span>
                  <span className="block text-sm opacity-75">
                    {p.maxActiveListings} vehículos, {p.featuredSlots ? `${p.featuredSlots} destacados` : "sin destacados"}, {p.durationDays} días
                  </span>
                </span>
                <span className="wide text-lg font-extrabold whitespace-nowrap">{formatPrice(p.priceDop, "DOP")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
