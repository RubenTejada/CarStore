"use client";

import { useEffect, useState } from "react";
import type { FinderFacets } from "@/lib/finder-facets";

// Caché en memoria del navegador: repetir una selección (o volver a ella) no vuelve a la red.
// Guarda la promesa, así dos pedidos simultáneos de la misma selección comparten una sola petición.
const TTL_MS = 30_000;
const MAX_ENTRIES = 100;
const cache = new Map<string, { at: number; promise: Promise<FinderFacets> }>();

function load(query: string): Promise<FinderFacets> {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetch(`/api/buscador/caracteristicas?${query}`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<FinderFacets>;
  });
  promise.catch(() => cache.delete(query)); // un error no queda cacheado
  cache.delete(query);
  cache.set(query, { at: Date.now(), promise });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return promise;
}

/** Adelanta la carga (p. ej. al pasar el mouse sobre una marca). */
export function prefetchFinderFacets(query: string) {
  load(query).catch(() => {});
}

/**
 * Facetas para la selección actual del buscador. Mientras llega una respuesta nueva se
 * mantiene la anterior (`loading` en true) para que la lista no parpadee.
 */
export function useFinderFacets(query: string | null) {
  const [state, setState] = useState<{ query: string | null; data: FinderFacets | null; error: boolean }>({ query: null, data: null, error: false });

  useEffect(() => {
    if (query === null) return;
    let current = true;
    load(query).then(
      (data) => current && setState({ query, data, error: false }),
      () => current && setState((s) => ({ ...s, query, error: true })),
    );
    return () => {
      current = false;
    };
  }, [query]);

  return {
    data: query === null ? null : state.data,
    /** Selección a la que corresponde `data` (puede ser la anterior mientras carga). */
    dataQuery: state.query,
    loading: query !== null && state.query !== query,
    error: state.error && state.query === query,
  };
}
