"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Galería con miniaturas, gesto de deslizar y visor a pantalla completa. */
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const n = photos.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!n) return <div className="grid aspect-[3/2] place-items-center rounded-xl bg-surface-2 text-muted">Sin fotos</div>;

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
      <div className="group relative aspect-[3/2] overflow-hidden rounded-xl bg-night" {...swipe}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={index} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Image src={photos[index]} alt={`${alt}, foto ${index + 1} de ${n}`} fill priority={index === 0} sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <button type="button" onClick={() => setOpen(true)} className="absolute inset-0 cursor-zoom-in" aria-label="Ver fotos en pantalla completa" />
        {n > 1 && (
          <>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
          </>
        )}
        <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-sm font-semibold text-white">
          <Expand className="size-3.5" aria-hidden />
          {index + 1} / {n}
        </span>
      </div>

      {n > 1 && (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto" aria-label="Miniaturas">
          {photos.map((p, i) => (
            <li key={p + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={cn("relative block h-16 w-24 overflow-hidden rounded-lg border-2 transition-opacity", i === index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <Image src={p} alt="" fill sizes="96px" className="object-cover" />
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

function NavButton({ side, onClick, always }: { side: "left" | "right"; onClick: () => void; always?: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Foto anterior" : "Foto siguiente"}
      className={cn(
        "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-night shadow-lg transition-opacity hover:bg-white",
        side === "left" ? "left-3" : "right-3",
        !always && "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
