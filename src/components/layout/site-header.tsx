import Link from "next/link";
import { Menu, Plus, User } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { MainNavLinks } from "./main-nav";
import { SavedLink } from "@/components/saved/saved-link";
import { LOOK } from "./look";

const NAV = [
  { href: "/vehiculos", label: "Vehículos" },
  { href: "/dealers", label: "Dealers" },
  { href: "/financiamiento", label: "Financiamiento" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const ACCOUNT_LABEL = { ADMIN: "Administración", BUYER: "Mi cuenta", DEALER: "Mi panel", SELLER: "Mi panel" };
  const account = user ? { href: homeFor(user.role), label: ACCOUNT_LABEL[user.role] } : { href: "/login", label: "Iniciar sesión" };
  const dark = LOOK === "marco";
  const ghost = cn(button("ghost", "sm"), dark && "text-white hover:bg-white/10");
  return (
    <header className={cn("sticky top-0 z-40 border-b backdrop-blur", dark ? "border-white/10 bg-night/95" : "border-line bg-surface/90")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Logo intro inverted={dark} className="w-28 min-[400px]:w-40 sm:w-44" />
        <nav className="hidden self-stretch lg:flex" aria-label="Principal">
          <MainNavLinks items={NAV} variant="bar" dark={dark} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SavedLink className={cn(ghost, "hidden sm:inline-flex")} />
          <Link href={account.href} className={cn(ghost, "hidden sm:inline-flex")}>
            <User className="size-4" aria-hidden />
            {account.label}
          </Link>
          <Link href={!user ? "/registro" : user.role === "ADMIN" ? "/admin/vehiculos" : user.role === "BUYER" ? "/planes" : "/panel/vehiculos/nuevo"} className={cn(button("primary", "sm"), "h-11")} aria-label={user?.role === "BUYER" ? "Ver planes para vender" : "Publicar vehículo"}>
            <Plus className="size-4" aria-hidden />
            <span>{user?.role === "BUYER" ? "Vender" : "Publicar"}</span>
          </Link>
          <details className="relative lg:hidden">
            <summary className={cn(ghost, "h-11 list-none [&::-webkit-details-marker]:hidden")} aria-label="Abrir menú">
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav className="absolute right-0 mt-2 grid w-56 gap-0.5 rounded-xl border border-line bg-surface p-2 shadow-xl" aria-label="Menú móvil">
              <MainNavLinks items={[...NAV, { href: "/guardados", label: "Guardados" }, { href: "/planes", label: "Planes para publicar" }, account]} variant="menu" />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
