import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Cog,
  DoorOpen,
  ExternalLink,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Route,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { siApple, siGooglemaps, siUber, siWaze, type SimpleIcon } from "simple-icons";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { vehicleCardSelect } from "@/lib/search";
import { getUsdRate } from "@/lib/exchange-rate";
import { getFinancingData } from "@/lib/financing";
import {
  BODY_TYPE_LABEL,
  CONDITION_LABEL,
  DRIVETRAIN_LABEL,
  FEATURE_CATEGORY_LABEL,
  FUEL_LABEL,
  TRANSMISSION_LABEL,
  VEHICLE_STATUS_LABEL,
  formatKm,
  formatPrice,
  formatRate,
  toDop,
} from "@/lib/labels";
import { directionsUrls, googleMapsUrl, vehicleTitle, vehicleUrl, whatsappUrl } from "@/lib/urls";
import { FeatureIcon } from "@/lib/feature-icons";
import { VehicleMedia } from "@/components/vehicle/vehicle-media";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { MapView } from "@/components/map/map-view";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { BodySilhouette } from "@/components/browse/body-silhouette";
import { CompareToggle } from "@/components/compare/compare-toggle";
import { LoanCalculator } from "@/components/financing/loan-calculator";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { FeatureCategory } from "@/generated/prisma/enums";

const getVehicle = (id: string) =>
  db.vehicle.findUnique({
    where: { id },
    include: {
      model: { include: { brand: true } },
      dealer: true,
      owner: { select: { name: true, phone: true } },
      photos: { orderBy: { position: "asc" } },
      features: { include: { feature: true } },
    },
  });

export async function generateMetadata({ params }: PageProps<"/vehiculos/[id]/[slug]">): Promise<Metadata> {
  const v = await getVehicle((await params).id);
  if (!v || v.status !== "ACTIVE") return { title: "Vehículo no disponible" };
  const title = `${vehicleTitle(v)} ${v.year} en ${formatPrice(v.price, v.currency)}`;
  return { title, description: v.description ?? undefined, openGraph: { title, images: v.photos[0]?.url } };
}

export default async function VehiclePage({ params }: PageProps<"/vehiculos/[id]/[slug]">) {
  const { id, slug } = await params;
  const v = await getVehicle(id);
  if (!v) notFound();
  const [user, usd, financing] = await Promise.all([getCurrentUser(), getUsdRate(), getFinancingData()]);
  const isOwner = !!user && canEditVehicle(user, v);
  if (v.status !== "ACTIVE" && !isOwner) notFound();
  const canonical = vehicleUrl(v);
  if (canonical.split("/").pop() !== slug) permanentRedirect(canonical);

  if (!isOwner) await db.vehicle.update({ where: { id }, data: { views: { increment: 1 } } });

  const similar = await db.vehicle.findMany({
    where: { status: "ACTIVE", id: { not: v.id }, OR: [{ modelId: v.modelId }, { bodyType: v.bodyType, priceDop: { gte: v.priceDop * 0.6, lte: v.priceDop * 1.4 } }] },
    select: vehicleCardSelect,
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  const title = vehicleTitle(v);
  const contactPhone = v.dealer?.whatsapp ?? v.dealer?.phone ?? v.owner.phone;
  const callPhone = v.dealer?.phone ?? v.owner.phone;
  const message = `Hola, me interesa el ${title} ${v.year} publicado en TuCarroOnline.com por ${formatPrice(v.price, v.currency)}.`;

  const specs: [LucideIcon, string, string | null][] = [
    [Calendar, "Año", String(v.year)],
    [Gauge, "Kilometraje", formatKm(v.mileageKm)],
    [Cog, "Transmisión", TRANSMISSION_LABEL[v.transmission]],
    [Fuel, "Combustible", FUEL_LABEL[v.fuel]],
    [Route, "Tracción", DRIVETRAIN_LABEL[v.drivetrain]],
    [Wrench, "Motor", v.engine],
    [Palette, "Color exterior", v.extColor],
    [Palette, "Color interior", v.intColor],
    [DoorOpen, "Puertas", v.doors ? String(v.doors) : null],
    [Users, "Pasajeros", v.seats ? String(v.seats) : null],
  ];

  const priceDop = toDop(v.price, v.currency, usd.rate);
  const address = v.dealer?.address ?? v.province;
  const routes = directionsUrls(v.lat, v.lng);
  const routeLinks: [SimpleIcon, string, string][] = [
    [siGooglemaps, "Google Maps", routes.google],
    [siWaze, "Waze", routes.waze],
    [siApple, "Apple Maps", routes.apple],
    [siUber, "Pedir un Uber", routes.uber],
  ];

  const grouped = (Object.keys(FEATURE_CATEGORY_LABEL) as FeatureCategory[])
    .map((cat) => ({ cat, items: v.features.map((f) => f.feature).filter((f) => f.category === cat) }))
    .filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {v.status !== "ACTIVE" && (
        <p className="mb-4 rounded-lg border border-sun bg-sun/15 px-4 py-3 text-sm font-medium">
          Vista previa: este vehículo está en estado «{VEHICLE_STATUS_LABEL[v.status]}» y no aparece en las búsquedas.
        </p>
      )}
      <nav className="text-sm text-muted" aria-label="Ruta">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/vehiculos" className="hover:text-ink">
              Vehículos
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/vehiculos?tipo=${v.bodyType.toLowerCase()}`} className="hover:text-ink">
              {BODY_TYPE_LABEL[v.bodyType]}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/vehiculos?marca=${v.model.brand.slug}`} className="hover:text-ink">
              {v.model.brand.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/vehiculos?marca=${v.model.brand.slug}&modelo=${v.model.slug}`} className="hover:text-ink">
              {v.model.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <VehicleMedia photos={v.photos.map((p) => p.url)} spinFrames={v.spinFrames} spinVideo={v.spinVideo} interiorPano={v.interiorPano} alt={`${title} ${v.year}`} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="plate text-sm">{v.year}</span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${v.condition === "NEW" ? "bg-accent text-white" : "bg-surface-2"}`}>{CONDITION_LABEL[v.condition]}</span>
            <span className="text-sm text-muted">{v.views.toLocaleString("es-DO")} visitas</span>
          </div>
          <h1 className="display mt-3 text-3xl">
            {title}
            {v.trim && <span className="block text-xl font-semibold text-muted">{v.trim}</span>}
          </h1>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-brand">{formatPrice(v.price, v.currency)}</p>
          {v.currency === "USD" && (
            <p className="text-sm text-muted">
              Aprox. {formatPrice(toDop(v.price, v.currency, usd.rate), "DOP")} a {formatRate(usd.rate)} por dólar{usd.publishedOn && " (tasa del Banco Central)"}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface text-center">
            {[
              ["Kilometraje", formatKm(v.mileageKm)],
              ["Transmisión", TRANSMISSION_LABEL[v.transmission]],
              ["Combustible", FUEL_LABEL[v.fuel]],
            ].map(([k, val]) => (
              <div key={k} className="px-2 py-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 text-sm font-bold">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid gap-2">
            {contactPhone && (
              <a href={whatsappUrl(contactPhone, message)} target="_blank" rel="noopener noreferrer" className={cn(button("primary", "lg"), "bg-[#1f8a4c]")}>
                <MessageCircle className="size-5" aria-hidden />
                Escribir por WhatsApp
              </a>
            )}
            {callPhone && (
              <a href={`tel:${callPhone.replace(/[^\d+]/g, "")}`} className={button("outline", "lg")}>
                <Phone className="size-5" aria-hidden />
                Llamar al {callPhone}
              </a>
            )}
            <CompareToggle variant="button" item={{ id: v.id, title, year: v.year, photo: v.photos[0]?.url }} />
          </div>

          <div className="mt-5 rounded-xl border border-line bg-surface p-4">
            {v.dealer ? (
              <Link href={`/dealers/${v.dealer.slug}`} className="flex items-center gap-3">
                <DealerBadge dealer={v.dealer} className="size-12" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-bold">
                    {v.dealer.name}
                    {v.dealer.verified && <BadgeCheck className="size-4 text-brand" aria-label="Verificado" />}
                  </span>
                  <span className="text-sm text-muted">Ver inventario del dealer</span>
                </span>
              </Link>
            ) : (
              <p>
                <span className="font-bold">{v.owner.name}</span>
                <span className="block text-sm text-muted">Vendedor particular</span>
              </p>
            )}
            <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-3 text-sm text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {address}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-12 space-y-12">
          <section>
            <h2 className="display text-2xl">Ficha técnica</h2>
            <dl className="mt-5 grid overflow-hidden rounded-xl border border-line bg-surface sm:grid-cols-2">
              <div className="flex items-center gap-3 p-4 shadow-[0_0_0_0.5px_var(--line)]">
                <BodySilhouette type={v.bodyType} className="h-5 w-12 text-ink [--glass:var(--surface)] [--rim:var(--surface)] [--tire:var(--ink)]" />
                <dt className="text-muted">Carrocería</dt>
                <dd className="ml-auto font-semibold">{BODY_TYPE_LABEL[v.bodyType]}</dd>
              </div>
              {specs
                .filter(([, , val]) => val)
                .map(([Icon, k, val]) => (
                  <div key={k} className="flex items-center gap-3 p-4 shadow-[0_0_0_0.5px_var(--line)]">
                    <Icon className="size-5 text-brand" aria-hidden />
                    <dt className="text-muted">{k}</dt>
                    <dd className="ml-auto text-right font-semibold">{val}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {grouped.length > 0 && (
            <section>
              <h2 className="display text-2xl">Características y facilidades</h2>
              <div className="mt-5 space-y-6">
                {grouped.map((g) => (
                  <div key={g.cat}>
                    <h3 className="wide font-bold">{FEATURE_CATEGORY_LABEL[g.cat]}</h3>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((f) => (
                        <li key={f.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2.5 text-sm font-medium">
                          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
                            <FeatureIcon icon={f.icon} className="size-4.5" />
                          </span>
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.description && (
            <section>
              <h2 className="display text-2xl">Descripción</h2>
              <p className="mt-4 max-w-prose leading-relaxed whitespace-pre-line text-ink/85">{v.description}</p>
            </section>
          )}

        <section>
          <h2 className="display text-2xl">Financiamiento</h2>
          <p className="mt-1 text-muted">
            Cuota estimada sobre {formatPrice(priceDop, "DOP")} con las tasas que publican las entidades financieras.
          </p>
          <div className="mt-5">
            <LoanCalculator
              vehicle
              limit={3}
              offers={financing.offers}
              price={priceDop}
              condition={v.condition}
              moreHref={`/financiamiento?precio=${priceDop}&condicion=${v.condition === "NEW" ? "nuevo" : "usado"}`}
            />
          </div>
        </section>

        <section>
          <h2 className="display text-2xl">Ubicación</h2>
          <p className="mt-1 text-muted">{address}</p>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
            <MapView
              className="h-[24rem] sm:h-[30rem] lg:h-[34rem]"
              cluster={false}
              points={[{ id: v.id, lat: v.lat, lng: v.lng, kind: "vehicle", title: `${title} ${v.year}`, subtitle: v.dealer?.name ?? v.province, href: canonical, image: v.photos[0]?.url }]}
            />
            <div className="rounded-xl border border-line bg-surface p-5 lg:self-start">
              <h3 className="wide font-bold">Cómo llegar</h3>
              <p className="mt-1 text-sm text-muted">Abre la ruta desde donde estás en tu app favorita.</p>
              <ul className="mt-4 grid gap-2">
                {routeLinks.map(([icon, name, href]) => (
                  <li key={name}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(button("outline", "md"), "w-full justify-start")}>
                      <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
                        <path d={icon.path} fill={icon.hex === "000000" ? "currentColor" : `#${icon.hex}`} />
                      </svg>
                      {name}
                      <ExternalLink className="ml-auto size-3.5 text-muted" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <dt className="sr-only">Dirección</dt>
                  <dd>{address}</dd>
                </div>
                {v.dealer?.hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    <dt className="sr-only">Horario</dt>
                    <dd className="whitespace-pre-line">{v.dealer.hours}</dd>
                  </div>
                )}
              </dl>
              <a href={googleMapsUrl(v.lat, v.lng)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                Ver el punto en Google Maps
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <p className="mt-4 text-xs text-muted">Coordina la visita con el vendedor antes de ir.</p>
            </div>
          </div>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="display text-2xl">Vehículos similares</h2>
          <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => (
              <li key={s.id}>
                <VehicleCard v={s} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
