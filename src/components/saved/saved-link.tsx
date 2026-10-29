"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSaved } from "./use-saved";

/** Acceso a /guardados en la cabecera, con cuántos hay. */
export function SavedLink({ className }: { className?: string }) {
  const { ids } = useSaved();
  return (
    <Link href="/guardados" className={cn("relative", className)} aria-label={ids.length ? `Guardados (${ids.length})` : "Guardados"}>
      <Heart className="size-4" aria-hidden />
      {ids.length > 0 && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4.5 font-bold text-accent-ink">
          {ids.length}
        </span>
      )}
    </Link>
  );
}
