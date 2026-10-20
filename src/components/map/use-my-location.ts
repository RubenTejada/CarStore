"use client";

import { useCallback, useState } from "react";

export type LatLng = { lat: number; lng: number };

/** Ubicación del visitante bajo demanda (botón «Mi ubicación» de los mapas). */
export function useMyLocation() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // Objeto nuevo en cada éxito: los mapas lo usan para volver a encuadrar.
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      (e) => {
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Permite el acceso a tu ubicación en el navegador para usar esta opción."
            : "No pudimos obtener tu ubicación. Inténtalo de nuevo.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { pos, locating, error, locate };
}

/** Distancia en línea recta (haversine), en km. */
export function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("es-DO", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;

/** Puntos ordenados del más cercano al más lejano a `from`. */
export const byDistance = <T extends LatLng>(from: LatLng, points: T[]) =>
  points.map((p) => ({ point: p, km: distanceKm(from, p) })).sort((a, b) => a.km - b.km);
