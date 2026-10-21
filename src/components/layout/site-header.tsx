import Link from "next/link";
import { Menu, Plus, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { MainNavLinks } from "./main-nav";
import { LOOK } from "./look";

const NAV = [
  { href: "/vehiculos", label: "Vehículos" },
  { href: "/vehiculos?condicion=nuevo", label: "Nuevos" },
  { href: "/dealers", label: "Dealers" },
  { href: "/mapa", label: "Mapa" },
  { href: "/financiamiento", label: "Financiamiento" },
  { href: "/planes", label: "Planes" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const account = user ? { href: user.role === "ADMIN" ? "/admin" : "/panel", label: user.role === "ADMIN" ? "Administración" : "Mi panel" } : { href: "/login", label: "Iniciar sesión" };
  const dark = LOOK === "marco";
  const ghost = cn(button("ghost", "sm"), dark && "text-white hover:bg-white/10");
  return (
    <header className={cn("sticky top-0 z-40 border-b backdrop-blur", dark ? "border-white/10 bg-night/95" : "border-line bg-surface/90")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Logo intro inverted={dark} />
        <nav className="hidden self-stretch lg:flex" aria-label="Principal">
          <MainNavLinks items={NAV} variant="bar" dark={dark} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={account.href} className={cn(ghost, "hidden sm:inline-flex")}>
            <User className="size-4" aria-hidden />
            {account.label}
          </Link>
          <Link href={user ? "/panel/vehiculos/nuevo" : "/planes"} className={button("primary", "sm")}>
            <Plus className="size-4" aria-hidden />
            <span className="max-[380px]:sr-only">Publicar</span>
          </Link>
          <details className="relative lg:hidden">
            <summary className={cn(ghost, "list-none [&::-webkit-details-marker]:hidden")} aria-label="Abrir menú">
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav className="absolute right-0 mt-2 grid w-56 gap-0.5 rounded-xl border border-line bg-surface p-2 shadow-xl" aria-label="Menú móvil">
              <MainNavLinks items={[...NAV, account]} variant="menu" />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
