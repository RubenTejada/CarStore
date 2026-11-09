import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { officialDomainOf } from "@/lib/site-host";

/** Condición para servir la página oficial: dealer aprobado con un plan de página oficial vigente. */
const activeOfficialPlan = () => ({ status: "ACTIVE" as const, endsAt: { gt: new Date() }, plan: { officialSite: true } });

export const hasOfficialSite = (dealerId: string) => db.subscription.count({ where: { dealerId, ...activeOfficialPlan() } }).then(Boolean);

const findOfficialDealer = cache((domain: string) =>
  db.dealer.findFirst({ where: { customDomain: domain, status: "APPROVED", subscriptions: { some: activeOfficialPlan() } } }),
);

/** URL absoluta en el dominio propio del dealer. */
export const officialUrl = (domain: string, path = "/") => new URL(path, `https://${domain}`).href;

/**
 * Dealer dueño del dominio de la petición. `/sitio/...` solo responde por el propio dominio (proxy.ts
 * reescribe hacia aquí); fuera de él no existe. Sin plan vigente, la visita sigue en el portal.
 */
export async function getOfficialSite(domain: string, fallbackPath: (slug: string | null) => string) {
  if (officialDomainOf((await headers()).get("host")) !== domain) notFound();
  const dealer = await findOfficialDealer(domain);
  if (dealer) return dealer;
  const owner = await db.dealer.findUnique({ where: { customDomain: domain }, select: { slug: true, status: true } });
  redirect(siteUrl(fallbackPath(owner?.status === "APPROVED" ? owner.slug : null)));
}

/** Para el layout: no redirige, la página decide a dónde enviar la visita. */
export async function findOfficialSite(domain: string) {
  if (officialDomainOf((await headers()).get("host")) !== domain) return null;
  return findOfficialDealer(domain);
}
