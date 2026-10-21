"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Galería con miniaturas, gesto de deslizar y visor a pantalla completa.
 * `compact` muestra un carrusel de tres miniaturas (columnas del comparador); `autoplay` rota las fotos cada N ms
 * mientras nadie la está usando. `children` se pinta encima de la foto (placas, botones).
 */
export function Gallery({
  photos,
  alt,
  compact = false,
  autoplay,
  sizes = "(min-width: 1024px) 60vw, 100vw",
  children,
}: {
  photos: string[];
  alt: string;
  compact?: boolean;
  autoplay?: number;
  sizes?: string;
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLUListElement>(null);
  const n = photos.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Se reprograma en cada cambio de foto, así avanzar a mano reinicia la cuenta.
  useEffect(() => {
    if (!autoplay || n < 2 || paused || open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(1), autoplay);
    return () => clearTimeout(t);
  }, [autoplay, n, paused, open, index, go]);

  // Mantiene visible la miniatura activa moviendo solo la tira, no la página.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft;
    if (left < strip.scrollLeft || left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const radius = compact ? "rounded-lg" : "rounded-xl";
  if (!n)
    return (
      <div className={cn("relative grid aspect-[3/2] place-items-center bg-surface-2 text-muted", radius)}>
        Sin fotos
        {children}
      </div>
    );

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touchX.current = null;
    },
  };

  return (
    <div>
      <div
        className={cn("group relative aspect-[3/2] overflow-hidden bg-night", radius)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        {...swipe}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={index} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Image src={photos[index]} alt={`${alt}, foto ${index + 1} de ${n}`} fill priority={index === 0} sizes={sizes} className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <button type="button" onClick={() => setOpen(true)} className="absolute inset-0 cursor-zoom-in" aria-label="Ver fotos en pantalla completa" />
        {n > 1 && (
          <>
            <NavButton side="left" onClick={() => go(-1)} small={compact} />
            <NavButton side="right" onClick={() => go(1)} small={compact} />
          </>
        )}
        <span
          className={cn(
            "pointer-events-none absolute flex items-center gap-1.5 rounded-md bg-black/60 font-semibold text-white",
            compact ? "right-2 bottom-2 px-2 py-0.5 text-xs" : "right-3 bottom-3 px-2.5 py-1 text-sm",
          )}
        >
          <Expand className={compact ? "size-3" : "size-3.5"} aria-hidden />
          {index + 1} / {n}
        </span>
        {children}
      </div>

      {n > 1 && (
        <ul
          ref={thumbsRef}
          className={cn("scrollbar-none relative flex gap-2 overflow-x-auto", compact ? "mt-2 snap-x snap-mandatory overscroll-x-contain" : "mt-3")}
          aria-label="Miniaturas"
        >
          {photos.map((p, i) => (
            <li key={p + i} className={cn("shrink-0", compact && "basis-[calc((100%-1rem)/3)] snap-start")}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block overflow-hidden border-2 transition-opacity",
                  compact ? "aspect-[3/2] w-full rounded-md" : "h-16 w-24 rounded-lg",
                  i === index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={p} alt="" fill sizes={compact ? "120px" : "96px"} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        aria-label={`Fotos de ${alt}`}
      >
        {open && (
          <div className="relative flex h-full flex-col" {...swipe}>
            <div className="flex items-center justify-between p-4">
              <span className="font-semibold">
                {index + 1} / {n}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <Image src={photos[index]} alt={`${alt}, foto ${index + 1} de ${n}`} fill sizes="100vw" className="object-contain" />
              {n > 1 && (
                <>
                  <NavButton side="left" onClick={() => go(-1)} always />
                  <NavButton side="right" onClick={() => go(1)} always />
                </>
              )}
            </div>
            <div className="h-6" />
          </div>
        )}
      </dialog>
    </div>
  );
}

function NavButton({ side, onClick, always, small }: { side: "left" | "right"; onClick: () => void; always?: boolean; small?: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Foto anterior" : "Foto siguiente"}
      className={cn(
        "absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full bg-white/90 text-night shadow-lg transition-opacity hover:bg-white",
        small ? "size-8" : "size-11",
        side === "left" ? (small ? "left-2" : "left-3") : small ? "right-2" : "right-3",
        !always && "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
      )}
    >
      <Icon className={small ? "size-4" : "size-5"} aria-hidden />
    </button>
  );
}
