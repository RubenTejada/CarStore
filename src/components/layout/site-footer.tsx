import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-night text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Vehículos nuevos y usados de dealers y particulares en toda la República Dominicana.
          </p>
        </div>
        <FooterCol title="Buscar" links={[["/vehiculos?tipo=jeepeta", "Jeepetas"], ["/vehiculos?tipo=sedan", "Sedanes"], ["/vehiculos?tipo=pickup", "Camionetas"], ["/vehiculos?condicion=nuevo", "Vehículos nuevos"]]} />
        <FooterCol title="Explorar" links={[["/dealers", "Dealers"], ["/mapa", "Mapa de vehículos"], ["/financiamiento", "Financiamiento"], ["/compra-segura", "Guía de compra segura"], ["/planes", "Planes para publicar"]]} />
        <FooterCol title="Tu cuenta y ayuda" links={[["/login", "Iniciar sesión"], ["/registro", "Crear cuenta"], ["/registro?tipo=dealer", "Registrar mi dealer"], ["/legal", "Información legal"], ["/legal/contacto", "Reclamaciones y derechos"]]} />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-5 text-xs sm:px-6">
          <nav aria-label="Políticas legales" className="flex flex-wrap gap-x-5 gap-y-2">
            {[["terminos", "Términos"], ["privacidad", "Privacidad"], ["cookies", "Cookies"], ["publicaciones", "Publicaciones"], ["pagos", "Pagos y reembolsos"], ["avisos", "Avisos legales"]].map(([slug, title]) => <Link key={slug} href={`/legal/${slug}`} className="hover:text-white hover:underline">{title}</Link>)}
          </nav>
          <p>Los vehículos son ofrecidos por sus vendedores. TuCarroOnline no recibe pagos ni reservas de vehículos. Confirma precio, disponibilidad, impuestos y garantías con el vendedor.</p>
          <p>© {new Date().getFullYear()} TuCarroOnline.com. Las marcas y logos pertenecen a sus respectivos dueños.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="wide text-sm font-bold text-white">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
