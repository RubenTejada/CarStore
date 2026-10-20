"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, type Marker } from "@googlemaps/markerclusterer";
import { Building2, Car } from "lucide-react";
import { cn } from "@/lib/cn";
import { DR_CENTER, DR_ZOOM } from "@/lib/provinces";
import { MapPointLink, SchematicMap } from "./schematic-map";
import type { MapPoint } from "./types";

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/**
 * Mapa de vehículos / dealers. Usa Google Maps con clusters si hay clave;
 * si no, el mapa esquemático de RD.
 */
export function MapView({
  points,
  className,
  zoom,
  cluster = true,
}: {
  points: MapPoint[];
  className?: string;
  zoom?: number;
  cluster?: boolean;
}) {
  if (!MAPS_KEY) return <SchematicMap points={points} className={cn("aspect-[1000/718]", className)} />;
  return (
    <div className={cn("overflow-hidden rounded-xl", className)}>
      <APIProvider apiKey={MAPS_KEY} language="es" region="DO">
        <Map
          mapId={MAP_ID}
          defaultCenter={points.length === 1 ? points[0] : DR_CENTER}
          defaultZoom={zoom ?? (points.length === 1 ? 15 : DR_ZOOM)}
          gestureHandling="cooperative"
          streetViewControl={false}
          mapTypeControl={false}
          className="h-full w-full"
        >
          <Markers points={points} cluster={cluster} />
        </Map>
      </APIProvider>
    </div>
  );
}

function Markers({ points, cluster }: { points: MapPoint[]; cluster: boolean }) {
  const map = useMap();
  const [markers, setMarkers] = useState<Record<string, Marker>>({});
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const clusterer = useMemo(() => (map && cluster ? new MarkerClusterer({ map }) : null), [map, cluster]);

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    clusterer.addMarkers(Object.values(markers));
  }, [clusterer, markers]);

  // Ajusta la vista a todos los puntos.
  useEffect(() => {
    if (!map || points.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 48);
  }, [map, points]);

  const setRef = useCallback(
    (marker: Marker | null, id: string) => {
      if (!cluster) return;
      setMarkers((prev) => {
        if ((marker && prev[id]) || (!marker && !prev[id])) return prev;
        if (marker) return { ...prev, [id]: marker };
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [cluster],
  );

  return (
    <>
      {points.map((p) => (
        <AdvancedMarker key={p.id} position={p} title={p.title} ref={(m) => setRef(m, p.id)} onClick={() => setSelected(p)}>
          <span
            className={cn(
              "grid size-9 place-items-center rounded-full border-[3px] border-white text-white shadow-lg",
              p.kind === "dealer" ? "bg-[#0b2a5b]" : "bg-[#d0142c]",
            )}
          >
            {p.kind === "dealer" ? <Building2 className="size-4" aria-hidden /> : <Car className="size-4" aria-hidden />}
          </span>
        </AdvancedMarker>
      ))}
      {selected && (
        <InfoWindow position={selected} pixelOffset={[0, -40]} onCloseClick={() => setSelected(null)} headerDisabled>
          <div className="w-64 text-[#0e1b33]">
            <MapPointLink p={selected} />
          </div>
        </InfoWindow>
      )}
    </>
  );
}
