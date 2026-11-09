"use client";

import { Check, Scale } from "lucide-react";
import { MAX_COMPARE, type CompareItem } from "@/lib/compare";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { useCompare } from "./use-compare";

/** Añade o quita un vehículo del comparador. `card` va sobre la foto de la tarjeta; `button` en la ficha. */
export function CompareToggle({ item, variant = "card", className }: { item: CompareItem; variant?: "card" | "button"; className?: string }) {
  const { has, full, toggle } = useCompare();
  const active = has(item.id);
  const disabled = !active && full;
  const Icon = active ? Check : Scale;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={disabled ? `Puedes comparar hasta ${MAX_COMPARE} vehículos` : undefined}
      onClick={() => toggle(item)}
      className={cn(
        variant === "card"
          ? "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold shadow-sm backdrop-blur transition-colors disabled:opacity-60"
          : button("outline", "lg"),
        variant === "card" && (active ? "bg-brand text-brand-ink" : "bg-surface/90 text-ink hover:bg-surface"),
        variant === "button" && active && "border-brand text-brand",
        className,
      )}
    >
      <Icon className={variant === "card" ? "size-3.5" : "size-5"} aria-hidden />
      {active ? "En comparación" : "Comparar"}
    </button>
  );
}
