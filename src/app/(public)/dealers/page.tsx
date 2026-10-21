import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { MapView } from "@/components/map/map-view";
import { input } from "@/components/ui/styles";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dealers" };

export default async function DealersPage({ searchParams }: PageProps<"/dealers">) {
  const sp = await searchParams;
  const provincia = typeof sp.provincia === "string" && PROVINCE_NAMES.includes(sp.provincia) ? sp.provincia : undefined;
  const dealers = await db.dealer.findMany({
    where: { status: "APPROVED", province: provincia },
    orderBy: [{ verified: "desc" }, { name: "asc" }],
    include: { _count: { select: { vehicles: { where: { status: "ACTIVE" } } } } },
  });
  const provinces = await db.dealer.groupBy({ by: ["province"], where: { status: "APPROVED" }, _count: true, orderBy: { province: "asc" } });

  return (
    <>
      <PageHeader
        title="Dealers"
        description={`${dealers.length} dealers ${provincia ? `en ${provincia}` : "en todo el país"}`}
        actions={
          <form method="get" className="w-64">
            <label htmlFor="provincia" className="sr-only">
              Provincia
            </label>
            <select id="provincia" name="provincia" defaultValue={provincia ?? ""} className={input} data-autosubmit>
              <option value="">Todas las provincias</option>
              {provinces.map((p) => (
                <option key={p.province} value={p.province}>
                  {p.province} ({p._count})
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit">Filtrar</button>
            </noscript>
          </form>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_28rem]">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dealers.map((d) => (
              <li key={d.id}>
                <Link href={`/dealers/${d.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-ink/40">
                  <div className="relative h-28 bg-night bg-cover bg-center" style={d.coverUrl ? { backgroundImage: `linear-gradient(rgba(11,26,54,.35),rgba(11,26,54,.65)),url(${d.coverUrl.replace("w=1600", "w=700")})` } : undefined}>
                    <DealerBadge dealer={d} className="absolute -bottom-6 left-4 size-14 border-4 border-surface" />
                  </div>
                  <div className="flex flex-1 flex-col p-4 pt-8">
                    <p className="flex items-center gap-1.5 text-lg font-bold">
                      {d.name}
                      {d.verified && <BadgeCheck className="size-4.5 text-brand" aria-label="Verificado" />}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin className="size-3.5" aria-hidden />
                      {d.province}
                    </p>
                    {d.phone && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <Phone className="size-3.5" aria-hidden />
                        {d.phone}
                      </p>
                    )}
                    <p className="mt-auto pt-4 text-sm font-semibold text-brand">{d._count.vehicles} vehículos en inventario</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <MapView
              className="h-[28rem]"
              points={dealers.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, kind: "dealer", title: d.name, subtitle: d.address ?? d.province, href: `/dealers/${d.slug}`, image: d.coverUrl }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
