"use client";

import { Heart } from "lucide-react";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { useSaved } from "./use-saved";

/** Guarda o quita un vehículo. `card` es solo el ícono sobre la foto de la tarjeta; `button`, el botón de la ficha. */
export function FavoriteToggle({ id, title, variant = "card", className }: { id: string; title: string; variant?: "card" | "button"; className?: string }) {
  const { has, toggle } = useSaved();
  const active = has(id);
  const text = active ? "Guardado" : "Guardar";
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={variant === "card" ? `Guardar ${title}` : undefined}
      title={variant === "card" ? (active ? "Quitar de guardados" : "Guardar") : undefined}
      onClick={() => toggle(id)}
      className={cn(
        variant === "card"
          ? "grid size-8 place-items-center rounded-md bg-surface/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
          : cn(button("outline", "lg"), active && "border-accent text-accent"),
        className,
      )}
    >
      <Heart className={cn(variant === "card" ? "size-4" : "size-5", active && "fill-accent text-accent")} aria-hidden />
      {variant === "button" && text}
    </button>
  );
}
