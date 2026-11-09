import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/seo";
import { officialDomainOf } from "@/lib/site-host";

export function proxy(request: NextRequest) {
  const domain = officialDomainOf(request.headers.get("host"));
  if (domain) return officialSite(request, domain);

  // Chequeo optimista: sin cookie de sesión no se entra a /panel, /admin ni /cuenta.
  // La autorización real (rol, dueño) se verifica en cada layout y Server Action.
  if (/^\/(panel|admin|cuenta)(\/|$)/.test(request.nextUrl.pathname) && !request.cookies.has("cs_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

/**
 * Dominio propio de un dealer (plan Página Oficial): la portada es su inventario y cada vehículo
 * suyo tiene su ficha; el resto del portal (cuentas, búsqueda, otros dealers) sigue en el dominio principal.
 */
function officialSite(request: NextRequest, domain: string) {
  const { pathname, search } = request.nextUrl;
  const vehicle = /^\/vehiculos\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  const target = pathname === "/" ? `/sitio/${domain}` : vehicle ? `/sitio/${domain}/vehiculos/${vehicle[1]}/${vehicle[2]}` : null;
  if (!target) return NextResponse.redirect(siteUrl(pathname + search));
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = {
  // Páginas, no recursos: archivos de Next, API, fotos subidas ni archivos estáticos (íconos, robots, sitemap).
  matcher: ["/((?!_next/|api/|uploads/|.*\\.(?:ico|png|jpe?g|webp|avif|gif|svg|txt|xml|webmanifest|js|css|map|woff2?|mp4|webm)$).*)"],
};
