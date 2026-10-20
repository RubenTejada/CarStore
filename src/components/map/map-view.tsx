"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, ControlPosition, InfoWindow, Map, MapControl, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, type Marker, type Renderer } from "@googlemaps/markerclusterer";
import { Building2, Car, LoaderCircle, LocateFixed, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { DR_CENTER, DR_ZOOM } from "@/lib/provinces";
import { MapPointLink, SchematicMap } from "./schematic-map";
import { MarkerPin, PIN_COLOR, PIN_PATH, PIN_VIEW } from "./marker-pin";
import type { MapPoint } from "./types";
import { byDistance, formatDistance, useMyLocation, type LatLng } from "./use-my-location";

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/**
 * Mapa de vehículos / dealers. Usa Google Maps con clusters si hay clave;
 * si no, el mapa esquemático de RD. Ambos tienen el botón «Mi ubicación».
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
  const me = useMyLocation();
  const locate = <LocateControl points={points} {...me} />;
  if (!MAPS_KEY)
    return (
      <SchematicMap points={points} me={me.pos} className={cn("aspect-[1000/718]", className)}>
        <div className="absolute top-2.5 left-2.5 z-10">{locate}</div>
      </SchematicMap>
    );
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
          <MapControl position={ControlPosition.TOP_LEFT}>
            <div className="m-2.5">{locate}</div>
          </MapControl>
          {me.pos && <MyLocationMarker pos={me.pos} points={points} />}
        </Map>
      </APIProvider>
    </div>
  );
}

function Markers({ points, cluster }: { points: MapPoint[]; cluster: boolean }) {
  const map = useMap();
  const [markers, setMarkers] = useState<Record<string, Marker>>({});
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const clusterer = useMemo(
    () => (map && cluster ? new MarkerClusterer({ map, renderer: brandClusterRenderer }) : null),
    [map, cluster],
  );

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
        <PointMarker key={p.id} point={p} setRef={setRef} onClick={setSelected} />
      ))}
      {selected && (
        <InfoWindow position={selected} pixelOffset={[0, -50]} onCloseClick={() => setSelected(null)} headerDisabled>
          <div className="w-64 text-[#0e1b33]">
            <MapPointLink p={selected} />
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// Clusters con el mismo pin del portal (azul de marca y el total en la cabeza) en vez de los de Google.
const brandClusterRenderer: Renderer = {
  render({ count, position }) {
    const w = count < 10 ? 40 : count < 50 ? 46 : 52;
    const h = (w * PIN_VIEW.h) / PIN_VIEW.w;
    const head = (w * PIN_VIEW.headY * 2) / PIN_VIEW.w;
    const el = document.createElement("div");
    el.style.cssText = `position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 3px 4px rgb(14 27 51 / .45));`;
    el.innerHTML = `<svg viewBox="0 0 ${PIN_VIEW.w} ${PIN_VIEW.h}" style="position:absolute;inset:0;width:100%;height:100%"><path d="${PIN_PATH}" fill="${PIN_COLOR.dealer}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg><span style="position:absolute;inset:0 0 auto;height:${head}px;display:grid;place-items:center;color:#fff;font:800 14px/1 system-ui,sans-serif">${count}</span>`;
    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: el,
      title: `${count} en esta zona`,
      zIndex: 1000 + count,
    });
  },
};

// Componente propio para que el ref callback sea estable: uno inline cambia en cada render,
// React lo desmonta y vuelve a montar, y setMarkers entra en un ciclo infinito.
function PointMarker({
  point,
  setRef,
  onClick,
}: {
  point: MapPoint;
  setRef: (marker: Marker | null, id: string) => void;
  onClick: (p: MapPoint) => void;
}) {
  const ref = useCallback((m: Marker | null) => setRef(m, point.id), [setRef, point.id]);
  return (
    <AdvancedMarker position={point} title={point.title} ref={ref} onClick={() => onClick(point)}>
      <MarkerPin color={PIN_COLOR[point.kind]}>
        {point.kind === "dealer" ? <Building2 className="size-4 text-white" aria-hidden /> : <Car className="size-4 text-white" aria-hidden />}
      </MarkerPin>
    </AdvancedMarker>
  );
}

/** Botón «Mi ubicación» y, una vez ubicado, la distancia al punto (o al más cercano). */
function LocateControl({
  points,
  pos,
  locating,
  error,
  locate,
}: { points: MapPoint[] } & ReturnType<typeof useMyLocation>) {
  const nearest = pos ? byDistance(pos, points)[0] : undefined;
  return (
    <div className="flex max-w-[min(18rem,calc(100vw-5rem))] flex-col items-start gap-1.5 text-[#0e1b33]">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold shadow-md ring-1 ring-black/10 hover:bg-[#eef1f5] disabled:opacity-70"
      >
        {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4 text-[#0b2a5b]" aria-hidden />}
        {pos ? "Centrar en mí" : "Mi ubicación"}
      </button>
      <p role="status" className={cn("rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium shadow-md ring-1 ring-black/10", !(error || nearest) && "sr-only")}>
        {error ??
          (nearest &&
            (points.length === 1 ? (
              <>Estás a {formatDistance(nearest.km)} en línea recta</>
            ) : (
              <>
                Más cercano a {formatDistance(nearest.km)}: <span className="font-bold">{nearest.point.title}</span>
              </>
            )))}
      </p>
    </div>
  );
}

// Marcador del visitante; al ubicarlo encuadra su posición junto a los puntos más cercanos.
function MyLocationMarker({ pos, points }: { pos: LatLng; points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const near = byDistance(pos, points).slice(0, 3);
    if (!near.length) {
      map.panTo(pos);
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds(pos);
    for (const n of near) bounds.extend(n.point);
    // Arriba deja sitio al control «Mi ubicación».
    map.fitBounds(bounds, { top: 120, right: 56, bottom: 56, left: 56 });
    // Si todo está muy cerca, fitBounds acerca hasta nivel de calle: limitar.
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
    });
    return () => listener.remove();
  }, [map, pos, points]);

  return (
    <AdvancedMarker position={pos} title="Tu ubicación" zIndex={2000}>
      <MyLocationPin />
    </AdvancedMarker>
  );
}

// Pin del visitante: más grande que los de vehículos/dealers y en amarillo de la marca para
// distinguirlo. La punta (borde inferior, ancla por defecto) cae en la posición y ahí late un halo.
function MyLocationPin() {
  return (
    <span className="relative flex flex-col items-center">
      <span className="absolute bottom-0 left-1/2 size-5 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-[#f5b700]/70" />
      <span className="mb-1 rounded-md bg-[#0b2a5b] px-2 py-0.5 text-[11px] font-extrabold tracking-wide whitespace-nowrap text-white uppercase shadow-md">
        Estás aquí
      </span>
      <MarkerPin color={PIN_COLOR.me} width={46}>
        <UserRound className="size-6 text-[#0b2a5b]" strokeWidth={2.5} aria-hidden />
      </MarkerPin>
    </span>
  );
}
