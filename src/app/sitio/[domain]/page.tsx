import type { Metadata } from "next";
import { findOfficialSite, getOfficialSite, officialUrl } from "@/lib/official-site";
import { NO_INDEX } from "@/lib/seo";
import { DealerInventory } from "@/components/dealer/dealer-inventory";

export async function generateMetadata({ params, searchParams }: PageProps<"/sitio/[domain]">): Promise<Metadata> {
  const { domain } = await params;
  const dealer = await findOfficialSite(domain);
  if (!dealer) return { robots: NO_INDEX };
  const description = dealer.description?.trim() || `Inventario de ${dealer.name} en ${dealer.province}, República Dominicana: fotos, precios y características de sus vehículos.`;
  const url = officialUrl(domain);
  return {
    title: { absolute: `${dealer.name}: vehículos en ${dealer.province}` },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "es_DO", siteName: dealer.name, url, title: dealer.name, description, images: dealer.coverUrl ? [{ url: officialUrl(domain, dealer.coverUrl) }] : [] },
    // Filtros y orden son vistas de la misma página.
    robots: Object.keys(await searchParams).length ? NO_INDEX : { index: true, follow: true },
  };
}

export default async function OfficialSiteHome({ params, searchParams }: PageProps<"/sitio/[domain]">) {
  const { domain } = await params;
  const dealer = await getOfficialSite(domain, (slug) => (slug ? `/dealers/${slug}` : "/"));
  return <DealerInventory dealer={dealer} searchParams={await searchParams} base="/" official />;
}
