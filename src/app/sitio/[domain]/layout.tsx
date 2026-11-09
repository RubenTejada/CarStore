import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { findOfficialSite } from "@/lib/official-site";
import { siteUrl } from "@/lib/seo";
import { whatsappUrl } from "@/lib/urls";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { AutoSubmit } from "@/components/ui/auto-submit";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

/** Página oficial de un dealer en su dominio propio (plan Página Oficial): su marca en lugar de la del portal. */
export async function generateMetadata({ params }: LayoutProps<"/sitio/[domain]">): Promise<Metadata> {
  const dealer = await findOfficialSite((await params).domain);
  return dealer ? { title: { default: dealer.name, template: `%s | ${dealer.name}` }, applicationName: dealer.name } : {};
}

export default async function OfficialSiteLayout({ children, params }: LayoutProps<"/sitio/[domain]">) {
  const dealer = await findOfficialSite((await params).domain);
  // Sin página oficial vigente la página redirige al portal; no hay marca que mostrar.
  if (!dealer) return children;
  const chat = dealer.whatsapp ?? dealer.phone;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <DealerBadge dealer={dealer} className="size-11" />
            <span className="wide truncate text-lg font-bold">{dealer.name}</span>
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-2" aria-label="Principal">
            <Link href="/" className={cn(button("ghost", "sm"), "hidden sm:inline-flex")}>
              Inventario
            </Link>
            {chat && (
              <a href={whatsappUrl(chat, `Hola ${dealer.name}, vi su inventario en su página web.`)} target="_blank" rel="noopener noreferrer" className={cn(button("primary", "sm"), "bg-[#157f3b] text-white")}>
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-24 bg-night text-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <DealerBadge dealer={dealer} className="size-12" />
              <span className="wide text-lg font-bold text-white">{dealer.name}</span>
            </div>
            {dealer.description && <p className="mt-4 max-w-md text-sm leading-relaxed">{dealer.description}</p>}
          </div>
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
              {dealer.address ?? dealer.province}
            </li>
            {dealer.hours && (
              <li className="flex gap-2.5 whitespace-pre-line">
                <Clock className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
                {dealer.hours}
              </li>
            )}
            {dealer.phone && (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
                <a href={`tel:${dealer.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">{dealer.phone}</a>
              </li>
            )}
            {dealer.email && (
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
                <a href={`mailto:${dealer.email}`} className="hover:text-white">{dealer.email}</a>
              </li>
            )}
          </ul>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-5 text-xs sm:px-6">
            {/* Las condiciones del servicio son las del portal, que opera la plataforma. */}
            <nav aria-label="Políticas legales" className="flex flex-wrap gap-x-5 gap-y-2">
              {[["terminos", "Términos"], ["privacidad", "Privacidad"], ["cookies", "Cookies"], ["avisos", "Avisos legales"], ["contacto", "Reclamaciones y derechos"]].map(([slug, title]) => (
                <a key={slug} href={siteUrl(`/legal/${slug}`)} className="hover:text-white hover:underline">{title}</a>
              ))}
            </nav>
            <p>Los vehículos son ofrecidos por {dealer.name}. Confirma precio, disponibilidad, impuestos y garantías directamente con el dealer.</p>
            <p>
              © {new Date().getFullYear()} {dealer.name}. Página publicada con{" "}
              <a href={siteUrl()} className="font-semibold text-white hover:underline">TuCarroOnline</a>.
            </p>
          </div>
        </div>
      </footer>
      <AutoSubmit />
    </div>
  );
}
