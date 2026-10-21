"use client";

import { useContext, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { SpinPlaybackContext } from "./view-360";

export function PlayToggle({ playing, onToggle, label = "giro", className }: { playing: boolean; onToggle: () => void; label?: string; className?: string }) {
  const Icon = playing ? Pause : Play;
  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={playing ? `Pausar ${label}` : `Reanudar ${label}`}
      title={playing ? `Pausar ${label}` : `Reanudar ${label}`}
      className={cn("grid size-9 place-items-center rounded-full bg-white/90 text-night shadow-md hover:bg-white", className)}
    >
      <Icon className="size-4 fill-current" aria-hidden />
    </button>
  );
}

/** Comparte el estado de giro automático entre los visores 360 de una sección. */
export function SpinPlayback({ children }: { children: React.ReactNode }) {
  const playing = useAutoplay(true);
  return <SpinPlaybackContext value={playing}>{children}</SpinPlaybackContext>;
}

/** Botón de la sección que pausa o reanuda todos los giros 360 dentro de su `SpinPlayback`. */
export function SectionPlayToggle({ className }: { className?: string }) {
  const ctx = useContext(SpinPlaybackContext);
  if (!ctx) return null;
  return (
    <button type="button" onClick={ctx.toggle} className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink", className)}>
      {ctx.playing ? <Pause className="size-4 fill-current" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
      {ctx.playing ? "Pausar giro 360°" : "Girar 360°"}
    </button>
  );
}

/** Giro automático que respeta "reducir movimiento" hasta que la persona elige con el botón. */
export function useAutoplay(autoplay: boolean) {
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = autoplay && (choice ?? !reduced);
  return { playing, toggle: () => setChoice(!playing), stop: () => setChoice(false) };
}
