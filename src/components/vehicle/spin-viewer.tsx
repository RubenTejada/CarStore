"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Hand, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { SpinPlaybackContext, optimizedUrl } from "./view-360";
import { PlayToggle, useAutoplay } from "./play-toggle";

const SECONDS_PER_TURN = 9;
const DRAG_PX_PER_TURN = 900;

/**
 * Giro exterior 360: dibuja en un canvas la secuencia de fotos y funde cada cuadro con el siguiente,
 * así el giro se ve continuo aunque haya pocos cuadros. Con `interactive` se gira arrastrando o con las
 * flechas; sin él (tarjetas) solo gira solo y deja pasar los clics al enlace. Mientras cargan los
 * cuadros se ve el primero como póster.
 *
 * Con `video` (el mismo giro en bucle, empezando en el primer cuadro) el giro automático es el video, más
 * suave y liviano que los cuadros; las tarjetas no cargan los cuadros. Al tocar el visor, el canvas sigue
 * desde el ángulo en que iba el video.
 */
export function SpinViewer({
  frames,
  video,
  alt,
  interactive = false,
  autoplay = true,
  priority = false,
  sizes = "100vw",
  className,
}: {
  frames: string[];
  video?: string | null;
  alt: string;
  interactive?: boolean;
  autoplay?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const section = useContext(SpinPlaybackContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const images = useRef<HTMLImageElement[]>([]);
  const pos = useRef(0); // posición en cuadros, con fracción
  const drag = useRef<{ x: number; pos: number; t: number; v: number } | null>(null);
  const velocity = useRef(0);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const own = useAutoplay(autoplay);
  const [angle, setAngle] = useState(0);
  // El video gira hasta que alguien gira a mano; `videoShown` cuando ya pintó su primer cuadro.
  const [videoActive, setVideoActive] = useState(!!video);
  const [videoShown, setVideoShown] = useState(false);
  const n = frames.length;
  const ready = n > 0 && loaded === n;
  const playing = autoplay && (section ?? own).playing;
  const needFrames = interactive || !video;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoActive) return;
    if (visible && playing) el.play().catch(() => {});
    else el.pause();
  }, [visible, playing, videoActive]);

  // Carga los cuadros cuando el visor se acerca a la pantalla y solo anima mientras se ve.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const startedLoading = useRef(false);
  useEffect(() => {
    if (!visible || !needFrames || startedLoading.current || !rootRef.current) return;
    startedLoading.current = true;
    const px = Math.round(rootRef.current.clientWidth * Math.min(devicePixelRatio, 2));
    images.current = frames.map((src) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = img.onerror = () => setLoaded((c) => c + 1);
      img.src = optimizedUrl(src, px);
      return img;
    });
  }, [visible, needFrames, frames]);

  // Bucle de dibujo: arrastre, inercia al soltar y giro automático.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ready || !visible || !canvas || !ctx || videoActive) return;

    const fit = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      drawn = NaN;
    };
    const cover = (img: HTMLImageElement) => {
      const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    let drawn = NaN;
    const draw = () => {
      const p = ((pos.current % n) + n) % n;
      if (p === drawn) return;
      drawn = p;
      const i = Math.floor(p), t = p - i;
      ctx.globalAlpha = 1;
      cover(images.current[i]);
      if (t > 0.02) {
        ctx.globalAlpha = t;
        cover(images.current[(i + 1) % n]);
      }
    };

    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (!drag.current) {
        if (Math.abs(velocity.current) > 1) {
          pos.current += velocity.current * dt;
          velocity.current *= Math.pow(0.02, dt);
        } else if (playing) {
          pos.current += (n / SECONDS_PER_TURN) * dt;
        } else {
          // En reposo se asienta en el cuadro más cercano: la mezcla de dos cuadros solo sirve en movimiento.
          const target = Math.round(pos.current);
          const d = target - pos.current;
          pos.current = Math.abs(d) < 0.01 ? target : pos.current + d * Math.min(1, dt * 12);
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ready, visible, playing, n, videoActive]);

  // Pasa del video al canvas en el mismo ángulo.
  const stopAutoplay = () => {
    own.stop();
    velocity.current = 0;
    const el = videoRef.current;
    if (videoActive && el) {
      if (el.duration) pos.current = (el.currentTime / el.duration) * n;
      el.pause();
      setVideoActive(false);
    }
  };
  const syncAngle = () => setAngle(Math.round(((((pos.current % n) + n) % n) * 360) / n) % 360);

  const handlers = interactive
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (!ready || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          stopAutoplay();
          drag.current = { x: e.clientX, pos: pos.current, t: e.timeStamp, v: 0 };
        },
        onPointerMove: (e: React.PointerEvent) => {
          const d = drag.current;
          if (!d) return;
          const next = d.pos - ((e.clientX - d.x) * n) / DRAG_PX_PER_TURN;
          const dt = (e.timeStamp - d.t) / 1000;
          if (dt > 0) d.v = 0.7 * d.v + 0.3 * ((next - pos.current) / dt);
          d.t = e.timeStamp;
          pos.current = next;
        },
        onPointerUp: () => {
          // Inercia al soltar, como mucho una vuelta por segundo.
          velocity.current = Math.max(-n, Math.min(n, drag.current?.v ?? 0));
          drag.current = null;
          syncAngle();
        },
        onPointerCancel: () => (drag.current = null),
        onKeyDown: (e: React.KeyboardEvent) => {
          const step = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
          if (!step || !ready) return;
          e.preventDefault();
          stopAutoplay();
          pos.current = Math.round(pos.current) + step;
          syncAngle();
        },
      }
    : {};

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden bg-[#e9ecf1]", interactive && "cursor-grab touch-pan-y select-none active:cursor-grabbing", className)}
      {...(interactive && {
        role: "slider",
        tabIndex: 0,
        "aria-label": `${alt}, vista 360 del exterior. Arrastra o usa las flechas para girar.`,
        "aria-valuemin": 0,
        "aria-valuemax": 359,
        "aria-valuenow": angle,
        "aria-valuetext": `${angle} grados`,
      })}
      {...handlers}
    >
      {n > 0 && <Image src={frames[0]} alt={interactive ? "" : `${alt}, vista 360`} fill priority={priority} sizes={sizes} className="object-cover" draggable={false} />}
      {/* Al pasar al canvas el video queda pausado debajo en el mismo ángulo, así el cambio no se nota. */}
      {video && (
        <video
          ref={videoRef}
          src={video}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          onPlaying={() => setVideoShown(true)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", videoShown ? "opacity-100" : "opacity-0")}
          aria-hidden
        />
      )}
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 size-full", !video && "transition-opacity duration-300", ready && !videoActive ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
      {interactive && (
        <>
          {!ready && visible && !(videoActive && videoShown) && (
            <span className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Cargando 360° {Math.round((loaded / n) * 100)}%
            </span>
          )}
          {ready && (
            <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-sm font-semibold text-white">
              <Hand className="size-4" aria-hidden />
              Arrastra para girar
            </span>
          )}
          {ready && autoplay && <PlayToggle playing={own.playing} onToggle={own.toggle} className="absolute right-3 bottom-3" />}
        </>
      )}
    </div>
  );
}
