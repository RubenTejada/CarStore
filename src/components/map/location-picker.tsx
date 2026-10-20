"use client";

import { useState } from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { Crosshair } from "lucide-react";
import { input, label, button } from "@/components/ui/styles";
import { MAPS_KEY, MAP_ID } from "./map-view";
import { SchematicMap } from "./schematic-map";

/** Selector de ubicación: clic en el mapa (o arrastrar el marcador) para fijar lat/lng. */
export function LocationPicker({ defaultLat, defaultLng }: { defaultLat: number; defaultLng: number }) {
  const [pos, setPos] = useState({ lat: defaultLat, lng: defaultLng });
  const [geoError, setGeoError] = useState<string | null>(null);

  const useMyLocation = () => {
    setGeoError(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }),
      () => setGeoError("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
    );
  };

  return (
    <div>
      {MAPS_KEY ? (
        <div className="h-80 overflow-hidden rounded-xl border border-line">
          <APIProvider apiKey={MAPS_KEY} language="es" region="DO">
            <Map
              mapId={MAP_ID}
              defaultCenter={pos}
              defaultZoom={14}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={false}
              onClick={(e) => e.detail.latLng && setPos({ lat: +e.detail.latLng.lat.toFixed(5), lng: +e.detail.latLng.lng.toFixed(5) })}
            >
              <AdvancedMarker
                position={pos}
                draggable
                onDragEnd={(e) => e.latLng && setPos({ lat: +e.latLng.lat().toFixed(5), lng: +e.latLng.lng().toFixed(5) })}
              />
            </Map>
          </APIProvider>
        </div>
      ) : (
        <SchematicMap points={[]} picked={pos} onPick={setPos} className="aspect-[1000/718] border border-line" />
      )}
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <div>
          <label className={label} htmlFor="lat">
            Latitud
          </label>
          <input id="lat" name="lat" type="number" step="0.00001" min={17.3} max={20.1} required className={input} value={pos.lat} onChange={(e) => setPos({ ...pos, lat: Number(e.target.value) })} />
        </div>
        <div>
          <label className={label} htmlFor="lng">
            Longitud
          </label>
          <input id="lng" name="lng" type="number" step="0.00001" min={-72.1} max={-68.2} required className={input} value={pos.lng} onChange={(e) => setPos({ ...pos, lng: Number(e.target.value) })} />
        </div>
        <button type="button" onClick={useMyLocation} className={button("outline", "md")}>
          <Crosshair className="size-4" aria-hidden />
          <span className="hidden sm:inline">Mi ubicación</span>
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{geoError ?? "Haz clic en el mapa para marcar la ubicación exacta."}</p>
    </div>
  );
}
