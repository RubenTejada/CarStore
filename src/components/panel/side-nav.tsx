"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col" aria-label="Panel">
      {items.map(({ href, label, icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
              active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
            )}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
