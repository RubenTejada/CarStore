import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Check, Globe, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FREE_PLAN } from "@/lib/listing-rules";
import { formatPrice } from "@/lib/labels";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = pageMetadata({ path: "/planes", title: "Planes para publicar y vender tu carro", description: "Publica tu carro en TuCarroOnline. Conoce los planes para vendedores particulares y dealers en República Dominicana y las opciones para destacar tus vehículos." });

export default async function PlansPage() {
  const [plans, user] = await Promise.all([db.plan.findMany({ where: { active: true }, orderBy: [{ forDealers: "asc" }, { priceDop: "asc" }] }), getCurrentUser()]);
  // El plan de página oficial va aparte, como vitrina, para que la cuadrícula de dealers no crezca.
  const official = plans.find((p) => p.officialSite && p.forDealers);
  const free = { ...FREE_PLAN, id: FREE_PLAN.name, description: "Para empezar a vender sin costo.", priceDop: 0, durationDays: null };
  const groups = [
    { title: "Particulares", text: "Vende tu propio vehículo.", forDealers: false, signup: "/registro" },
    { title: "Dealers", text: "Perfil del dealer con logo, ubicación en el mapa e inventario completo.", forDealers: true, signup: "/registro?tipo=dealer" },
  ].map((g) => ({ ...g, items: [free, ...plans.filter((p) => p.forDealers === g.forDealers && p !== official)] }));
  return (
    <>
      <PageHeader
        large
        width="6xl"
        title="Planes para publicar"
        description="Publica hasta 5 vehículos gratis. Para más vehículos y destacados en la portada, elige un plan, haz el pago por transferencia y la administración lo activa."
      />
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {groups.map((g) => (
          <section key={g.title} className="mt-10">
            <h2 className="display text-2xl">{g.title}</h2>
            <p className="mt-1 text-muted">{g.text}</p>
            <ul className={cn("mt-5 grid grid-cols-1 gap-5 md:grid-cols-2", g.items.length > 2 && "xl:grid-cols-4")}>
              {g.items.map((p, i) => {
                const highlight = i === g.items.length - 1;
                const paid = p.durationDays !== null;
                return (
                  <li key={p.id} className={cn("flex flex-col rounded-2xl border p-7", highlight ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface")}>
                    <h3 className="wide text-xl font-bold">{p.name}</h3>
                    {p.description && <p className="mt-1 opacity-80">{p.description}</p>}
                    <p className="mt-5">
                      <span className="display text-4xl">{formatPrice(p.priceDop, "DOP")}</span>
                      <span className="opacity-75">{paid ? ` por ${p.durationDays} días` : " sin vencimiento"}</span>
                    </p>
                    <ul className="mt-6 mb-8 space-y-2.5">
                      {[
                        `Hasta ${p.maxActiveListings} vehículos publicados`,
                        p.featuredSlots ? `${p.featuredSlots} ${p.featuredSlots === 1 ? "vehículo destacado" : "vehículos destacados"} en la portada` : "Sin destacados",
                        "Galería de fotos y características",
                        "Ubicación en el mapa",
                        ...(g.forDealers ? ["Perfil de dealer con logo e inventario"] : []),
                        ...("socialModule" in p && p.socialModule ? ["Publicación automática en Facebook e Instagram, editor de anuncios y métricas"] : []),
                      ].map((t) => (
                        <li key={t} className="flex gap-2.5">
                          <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={!user ? g.signup : paid ? "/panel/planes" : "/panel/vehiculos/nuevo"}
                      className={cn(button(highlight ? "primary" : "brand", "lg"), "mt-auto")}
                    >
                      {paid ? `Elegir ${p.name}` : "Empezar gratis"}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {g.forDealers && official && <OfficialSitePlan plan={official} href={!user ? g.signup : "/panel/planes"} />}
          </section>
        ))}
      </div>
    </>
  );
}

function OfficialSitePlan({ plan, href }: { plan: { name: string; description: string | null; priceDop: number; durationDays: number; maxActiveListings: number; featuredSlots: number; socialModule: boolean }; href: string }) {
  const perks = [
    ...(plan.socialModule ? ["Cada carro publicado sale en tu Facebook e Instagram"] : []),
    "Tu logo en toda la página",
    "Tu propio dominio, como www.tudealer.com.do",
    `Hasta ${plan.maxActiveListings} vehículos publicados`,
    `${plan.featuredSlots} vehículos destacados en la portada`,
    "Inventario, mapa y contacto directo con tus clientes",
  ];
  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl bg-night text-white">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-accent/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-sun/20 blur-3xl" />
      <div className="relative grid grid-cols-1 gap-10 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sun px-3 py-1 text-sm font-bold text-night">
            <Sparkles className="size-4" aria-hidden />
            Plan {plan.name}
          </p>
          <h3 className="display mt-4 text-3xl leading-tight sm:text-4xl">Convierte TuCarroOnline en tu página oficial</h3>
          <p className="mt-3 max-w-xl text-white/80">
            {plan.description ?? "Tu inventario con tu marca: tu logo y tu propio dominio."} Tus clientes entran a tu dirección web y ven tu dealer, no un portal.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {perks.map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <p>
              <span className="display text-4xl">{formatPrice(plan.priceDop, "DOP")}</span>
              <span className="text-white/75"> por {plan.durationDays} días</span>
            </p>
            <Link href={href} className={button("primary", "lg")}>
              Quiero mi página oficial
            </Link>
          </div>
        </div>
        <div aria-hidden className="rounded-2xl bg-white/10 p-2 shadow-2xl ring-1 ring-white/15">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="size-2.5 rounded-full bg-sun" />
            <span className="size-2.5 rounded-full bg-ok" />
            <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-night/60 px-2.5 py-1 text-xs text-white/85">
              <Globe className="size-3.5 shrink-0" />
              <span className="truncate">www.tudealer.com.do</span>
            </span>
          </div>
          <div className="rounded-xl bg-surface p-4 text-ink">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand text-sm font-black text-brand-ink">TU</span>
              <span className="wide font-bold">Tu Logo Motors</span>
              <span className="ml-auto rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink">Contactar</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-line">
                  <div className="aspect-[4/3] bg-surface-2" />
                  <div className="space-y-1 p-1.5">
                    <div className="h-1.5 w-3/4 rounded bg-line" />
                    <div className="h-1.5 w-1/2 rounded bg-brand/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
