import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/layout/logo";
import { SideNav, type NavItem } from "./side-nav";

/** Estructura común del panel de dealers y de la administración. */
export function PanelShell({ title, user, items, children }: { title: string; user: { name: string; email: string }; items: NavItem[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-night text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Logo inverted />
          <p className="text-sm text-white/55 lg:mt-1">{title}</p>
          <form action={logout} className="lg:hidden">
            <button type="submit" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
              <LogOut className="size-4" aria-hidden />
              Salir
            </button>
          </form>
        </div>
        <div className="px-3 pb-3 lg:flex-1 lg:overflow-y-auto">
          <SideNav items={items} />
        </div>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/55">{user.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              Ver portal
            </Link>
            <form action={logout}>
              <button type="submit" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
                <LogOut className="size-4" aria-hidden />
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}

export function PageTitle({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-3xl">{title}</h1>
        {text && <p className="mt-1 text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}
