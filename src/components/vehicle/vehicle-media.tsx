"use client";

import { useState } from "react";
import { Armchair, Images, Rotate3d } from "lucide-react";
import { cn } from "@/lib/cn";
import { Gallery } from "./gallery";
import { SpinViewer } from "./spin-viewer";
import { PanoViewer } from "./pano-viewer";

type Tab = "spin" | "photos" | "interior";

/** Medios de la ficha: fotos, giro exterior 360 e interior 360, en pestañas. Abre en el giro si lo hay. */
export function VehicleMedia({
  photos,
  spinFrames,
  spinVideo,
  interiorPano,
  alt,
}: {
  photos: string[];
  spinFrames: string[];
  spinVideo: string | null;
  interiorPano: string | null;
  alt: string;
}) {
  const tabs = (
    [
      ["spin", "360° exterior", Rotate3d, spinFrames.length > 0],
      ["photos", `Fotos (${photos.length})`, Images, true],
      ["interior", "Interior 360°", Armchair, !!interiorPano],
    ] as const
  ).filter(([, , , show]) => show);
  const [tab, setTab] = useState<Tab>(tabs[0][0]);

  if (tabs.length === 1) return <Gallery photos={photos} alt={alt} />;

  return (
    <div>
      <div role="tablist" aria-label="Medios del vehículo" className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
        {tabs.map(([id, text, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`media-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="media-panel"
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              tab === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {text}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="media-panel" aria-labelledby={`media-tab-${tab}`}>
        {tab === "photos" && <Gallery photos={photos} alt={alt} />}
        {tab === "spin" && <SpinViewer frames={spinFrames} video={spinVideo} alt={alt} interactive priority sizes="(min-width: 1024px) 60vw, 100vw" className="aspect-[3/2] rounded-xl" />}
        {tab === "interior" && interiorPano && <PanoViewer src={interiorPano} alt={alt} className="aspect-[3/2] rounded-xl" />}
      </div>
    </div>
  );
}
