"use client";

// Vista previa del anuncio en el navegador: la misma plantilla que genera la imagen final en el servidor,
// pintada a tamaño real (1080 px de ancho) y escalada para caber en su contenedor.
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/archivo/latin-800.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/oswald/latin-700.css";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/anton/latin-400.css";
import "@fontsource/playfair-display/latin-800.css";
import { useEffect, useRef, useState } from "react";
import { FORMATS, type AdData, type AdDesign } from "@/lib/social/design";
import { renderAd, type Painter } from "@/lib/social/templates";

function browserPainter(d: AdDesign, logo: string | null): Painter {
  return {
    logo,
    photo: (src, box, main) => {
      const zoom = main ? d.zoom : 1;
      const fx = main ? d.focusX : 50;
      const fy = main ? d.focusY : 50;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- debe coincidir píxel a píxel con la imagen del servidor
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ width: box.w, height: box.h, objectFit: "cover", objectPosition: `${fx}% ${fy}%`, transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}
        />
      );
    },
  };
}

export function AdPreview({ design, data, className, onPick }: { design: AdDesign; data: AdData; className?: string; onPick?: (x: number, y: number) => void }) {
  const { width: W, height: H } = FORMATS[design.format];
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    observer.observe(el);
    return () => observer.disconnect();
  }, [W]);

  return (
    <div
      ref={box}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: "hidden", cursor: onPick ? "crosshair" : undefined }}
      onClick={
        onPick
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onPick(Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100));
            }
          : undefined
      }
    >
      {scale > 0 && (
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}>
          {renderAd(design, data, W, H, browserPainter(design, data.logoUrl))}
        </div>
      )}
    </div>
  );
}
