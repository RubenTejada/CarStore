import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getFacets, searchVehicles } from "@/lib/search";
import { parseSearchParams, toQueryString } from "@/lib/search-params";
import { BODY_TYPES } from "@/lib/labels";
import { googleMapsUrl, whatsappUrl } from "@/lib/urls";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { MapView } from "@/components/map/map-view";
import { SortSelect } from "@/components/browse/sort-select";
import { BodySilhouette } from "@/components/browse/body-silhouette";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

const getDealer = (slug: string) => db.dealer.findUnique({ where: { slug } });

export async function generateMetadata({ params }: PageProps<"/dealers/[slug]">): Promise<Metadata> {
  const d = await getDealer((await params).slug);
  return d?.status === "APPROVED" ? { title: `${d.name}: vehículos en ${d.province}`, description: d.description ?? undefined } : { title: "Dealer no disponible" };
}

export default async function DealerPage({ params, searchParams }: PageProps<"/dealers/[slug]">) {
  const { slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer || dealer.status !== "APPROVED") notFound();

  const f = { ...parseSearchParams(await searchParams), dealer: slug };
  const [result, facets] = await Promise.all([searchVehicles(f), getFacets({ dealer: slug })]);
  const total = Object.values(facets.types).reduce((a, b) => a + (b ?? 0), 0);
  const base = `/dealers/${slug}`;
  const link = (o: Record<string, unknown>) => base + toQueryString({ ...f, dealer: undefined }, { pagina: undefined, ...o });

  return (
    <div>
      <section className="relative bg-night bg-cover bg-center text-white" style={dealer.coverUrl ? { backgroundImage: `linear-gradient(rgba(11,26,54,.55),rgba(11,26,54,.92)),url(${dealer.coverUrl})` } : undefined}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-4 pt-20 pb-10 sm:px-6">
          <DealerBadge dealer={dealer} className="size-24 border-4 border-white/90 text-3xl" />
          <div className="min-w-0 flex-1">
            <h1 className="display flex flex-wrap items-center gap-3 text-4xl">
              {dealer.name}
              {dealer.verified && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold" style={{ fontStretch: "100%" }}>
                  <BadgeCheck className="size-4" aria-hidden />
                  Verificado
                </span>
              )}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-white/80">
              <MapPin className="size-4" aria-hidden />
              {dealer.address ?? dealer.province}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(dealer.whatsapp ?? dealer.phone) && (
              <a href={whatsappUrl((dealer.whatsapp ?? dealer.phone)!, `Hola ${dealer.name}, vi su inventario en TuCarroOnline.com.`)} target="_blank" rel="noopener noreferrer" className={cn(button("primary", "md"), "bg-[#1f8a4c]")}>
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            )}
            {dealer.phone && (
              <a href={`tel:${dealer.phone.replace(/[^\d+]/g, "")}`} className={cn(button("outline", "md"), "border-white/30 bg-white/10 text-white hover:border-white")}>
                <Phone className="size-4" aria-hidden />
                {dealer.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="inventario">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="inventario" className="display text-2xl">
              Inventario <span className="text-muted">({total})</span>
            </h2>
            <SortSelect value={f.orden ?? "recientes"} />
          </div>
          <nav className="scrollbar-none mt-4 flex gap-2 overflow-x-auto" aria-label="Filtrar por tipo">
            <Link href={link({ tipo: undefined })} className={chip(!f.tipo)}>
              Todos ({total})
            </Link>
            {BODY_TYPES.filter((t) => facets.types[t.value]).map((t) => (
              <Link key={t.value} href={link({ tipo: t.value })} className={cn(chip(f.tipo === t.value), "flex items-center gap-2")}>
                <BodySilhouette
                  type={t.value}
                  className={cn("h-4 w-10 [--tire:currentColor]", f.tipo === t.value ? "[--glass:var(--brand)] [--rim:var(--brand)]" : "[--glass:var(--surface)] [--rim:var(--surface)]")}
                />
                {t.plural} ({facets.types[t.value]})
              </Link>
            ))}
          </nav>
          {result.items.length ? (
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((v) => (
                <li key={v.id}>
                  <VehicleCard v={v} className="h-full" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-muted">Este dealer no tiene vehículos publicados con ese filtro.</p>
          )}
          {result.pages > 1 && (
            <nav className="mt-8 flex justify-center gap-2" aria-label="Paginación">
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={link({ pagina: n === 1 ? undefined : n })} aria-current={n === result.page ? "page" : undefined} className={cn("grid size-10 place-items-center rounded-lg text-sm font-semibold", n === result.page ? "bg-brand text-brand-ink" : "border border-line bg-surface")}>
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </section>

        <aside className="space-y-6">
          {dealer.description && <p className="leading-relaxed text-ink/85">{dealer.description}</p>}
          <dl className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
            {dealer.hours && <Info icon={Clock} label="Horario" value={dealer.hours} />}
            {dealer.phone && <Info icon={Phone} label="Teléfono" value={dealer.phone} />}
            {dealer.email && <Info icon={Mail} label="Correo" value={<a href={`mailto:${dealer.email}`} className="text-brand hover:underline">{dealer.email}</a>} />}
            {dealer.website && <Info icon={Globe} label="Sitio web" value={<a href={dealer.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{dealer.website.replace(/^https?:\/\//, "")}</a>} />}
            <Info icon={MapPin} label="Dirección" value={dealer.address ?? dealer.province} />
          </dl>
          <div>
            <MapView className="h-64" cluster={false} points={[{ id: dealer.id, lat: dealer.lat, lng: dealer.lng, kind: "dealer", title: dealer.name, subtitle: dealer.address ?? dealer.province, href: base }]} />
            <a href={googleMapsUrl(dealer.lat, dealer.lng)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              Cómo llegar en Google Maps
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

const chip = (active: boolean) =>
  cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap", active ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface hover:border-ink");

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <div>
        <dt className="text-muted">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}
