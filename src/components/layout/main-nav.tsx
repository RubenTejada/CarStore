"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export type MainNavItem = { href: string; label: string };

// "Nuevos" y "Vehículos" comparten ruta; se distinguen por ?condicion=nuevo.
function isActive(href: string, pathname: string, params: URLSearchParams | null) {
  const [path, query] = href.split("?");
  if (pathname !== path && !pathname.startsWith(path + "/")) return false;
  const wanted = new URLSearchParams(query);
  if (wanted.size) return [...wanted].every(([k, v]) => params?.get(k) === v);
  return path === "/vehiculos" ? params?.get("condicion") !== "nuevo" : true;
}

function Links({ items, variant, active }: { items: MainNavItem[]; variant: "bar" | "menu"; active: (href: string) => boolean }) {
  return items.map(({ href, label }) => {
    const on = active(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={on ? "page" : undefined}
        // Cierra el <details> del menú móvil al navegar.
        onClick={variant === "menu" ? (e) => e.currentTarget.closest("details")?.removeAttribute("open") : undefined}
        className={
          variant === "bar"
            ? cn(
                "relative flex h-16 items-center px-3 text-[15px] font-medium transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-accent after:transition-transform after:duration-200",
                on ? "text-ink after:scale-x-100" : "text-muted after:scale-x-0 hover:text-ink",
              )
            : cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium transition-colors",
                "before:h-4 before:w-[3px] before:rounded-full before:transition-colors",
                on ? "bg-surface-2 text-ink before:bg-accent" : "text-muted before:bg-transparent hover:bg-surface-2 hover:text-ink",
              )
        }
      >
        {label}
      </Link>
    );
  });
}

function ActiveLinks(props: { items: MainNavItem[]; variant: "bar" | "menu" }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <Links {...props} active={(href) => isActive(href, pathname, params)} />;
}

export function MainNavLinks(props: { items: MainNavItem[]; variant: "bar" | "menu" }) {
  return (
    <Suspense fallback={<Links {...props} active={() => false} />}>
      <ActiveLinks {...props} />
    </Suspense>
  );
}
