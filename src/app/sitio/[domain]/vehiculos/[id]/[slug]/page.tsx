import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOfficialSite, officialUrl } from "@/lib/official-site";
import { siteUrl } from "@/lib/seo";
import VehiclePage, { generateMetadata as vehicleMetadata } from "@/app/(public)/vehiculos/[id]/[slug]/page";

/** Ficha de un vehículo del dealer en su dominio propio; la misma del portal, sin funciones del portal. */
export async function generateMetadata({ params, searchParams }: PageProps<"/sitio/[domain]/vehiculos/[id]/[slug]">): Promise<Metadata> {
  const { domain, id, slug } = await params;
  const meta = await vehicleMetadata({ params: Promise.resolve({ id, slug }), searchParams });
  const url = officialUrl(domain, `/vehiculos/${id}/${slug}`);
  return { ...meta, alternates: { canonical: url }, openGraph: meta.openGraph && { ...meta.openGraph, url } };
}

export default async function OfficialSiteVehicle({ params, searchParams }: PageProps<"/sitio/[domain]/vehiculos/[id]/[slug]">) {
  const { domain, id, slug } = await params;
  const path = `/vehiculos/${id}/${slug}`;
  const dealer = await getOfficialSite(domain, () => path);
  const v = await db.vehicle.findUnique({ where: { id }, select: { dealerId: true } });
  // Un vehículo de otro vendedor no se muestra con la marca de este dealer.
  if (v && v.dealerId !== dealer.id) redirect(siteUrl(path));
  return <VehiclePage params={Promise.resolve({ id, slug })} searchParams={searchParams} />;
}
