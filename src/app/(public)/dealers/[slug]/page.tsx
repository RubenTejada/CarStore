import type { Metadata } from "next";
import { cache } from "react";
import { browseMetadata, NO_INDEX } from "@/lib/seo";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DealerInventory } from "@/components/dealer/dealer-inventory";

const getDealer = cache((slug: string) => db.dealer.findUnique({ where: { slug } }));

export async function generateMetadata({ params, searchParams }: PageProps<"/dealers/[slug]">): Promise<Metadata> {
  const d = await getDealer((await params).slug);
  if (d?.status !== "APPROVED") return { title: "Dealer no disponible", robots: NO_INDEX };
  const meta = browseMetadata(`/dealers/${d.slug}`, await searchParams, `${d.name}: vehículos en ${d.province}`, d.description?.trim() || `Conoce el inventario de ${d.name} en ${d.province}, República Dominicana. Consulta fotos, precios y características de sus vehículos en TuCarroOnline.`);
  return d.demo ? { ...meta, robots: NO_INDEX } : meta;
}

export default async function DealerPage({ params, searchParams }: PageProps<"/dealers/[slug]">) {
  const { slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer || dealer.status !== "APPROVED") notFound();
  return <DealerInventory dealer={dealer} searchParams={await searchParams} base={`/dealers/${slug}`} />;
}
