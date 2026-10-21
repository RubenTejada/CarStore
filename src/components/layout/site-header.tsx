import Link from "next/link";
import { Menu, Plus, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

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
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Logo intro />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[15px] font-medium text-muted transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={account.href} className={cn(button("ghost", "sm"), "hidden sm:inline-flex")}>
            <User className="size-4" aria-hidden />
            {account.label}
          </Link>
          <Link href={user ? "/panel/vehiculos/nuevo" : "/planes"} className={button("primary", "sm")}>
            <Plus className="size-4" aria-hidden />
            <span className="max-[380px]:sr-only">Publicar</span>
          </Link>
          <details className="relative lg:hidden">
            <summary className={cn(button("ghost", "sm"), "list-none [&::-webkit-details-marker]:hidden")} aria-label="Abrir menú">
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-xl" aria-label="Menú móvil">
              {[...NAV, account].map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 font-medium hover:bg-surface-2">
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
