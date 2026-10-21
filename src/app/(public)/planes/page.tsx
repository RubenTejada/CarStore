import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/labels";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Planes para publicar" };

export default async function PlansPage() {
  const [plans, user] = await Promise.all([db.plan.findMany({ where: { active: true }, orderBy: [{ forDealers: "asc" }, { priceDop: "asc" }] }), getCurrentUser()]);
  const groups = [
    { title: "Particulares", text: "Vende tu propio vehículo.", items: plans.filter((p) => !p.forDealers), cta: user ? "/panel/planes" : "/registro" },
    { title: "Dealers", text: "Perfil del dealer con logo, ubicación en el mapa e inventario completo.", items: plans.filter((p) => p.forDealers), cta: user ? "/panel/planes" : "/registro?tipo=dealer" },
  ];
  return (
    <>
      <PageHeader
        large
        width="6xl"
        title="Planes para publicar"
        description="Elige un plan, haz el pago por transferencia y la administración lo activa. Los vehículos destacados aparecen en la portada."
      />
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {groups.map((g) => (
          <section key={g.title} className="mt-10">
            <h2 className="display text-2xl">{g.title}</h2>
            <p className="mt-1 text-muted">{g.text}</p>
            <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {g.items.map((p, i) => {
                const highlight = i === g.items.length - 1;
                return (
                  <li key={p.id} className={cn("flex flex-col rounded-2xl border p-7", highlight ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface")}>
                    <h3 className="wide text-xl font-bold">{p.name}</h3>
                    {p.description && <p className="mt-1 opacity-80">{p.description}</p>}
                    <p className="mt-5">
                      <span className="display text-4xl">{formatPrice(p.priceDop, "DOP")}</span>
                      <span className="opacity-75"> por {p.durationDays} días</span>
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {[
                        `Hasta ${p.maxActiveListings} vehículos publicados`,
                        p.featuredSlots ? `${p.featuredSlots} ${p.featuredSlots === 1 ? "vehículo destacado" : "vehículos destacados"} en la portada` : "Sin destacados",
                        "Galería de fotos y características",
                        "Ubicación en el mapa",
                        ...(p.forDealers ? ["Perfil de dealer con logo e inventario"] : []),
                      ].map((t) => (
                        <li key={t} className="flex gap-2.5">
                          <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Link href={g.cta} className={cn(button(highlight ? "primary" : "brand", "lg"), "mt-8")}>
                      Elegir {p.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
