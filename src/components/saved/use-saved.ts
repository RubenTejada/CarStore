"use client";

import { useEffect, useState } from "react";
import { createLocalList } from "@/lib/local-list";
import { MAX_RECENT, MAX_SAVED, parseIdList, pushRecent } from "@/lib/saved";
import type { VehicleCard } from "@/lib/search";

const saved = createLocalList("carstore:guardados", (raw) => parseIdList(raw, MAX_SAVED));
const recent = createLocalList("carstore:vistos", (raw) => parseIdList(raw, MAX_RECENT));

// Con sesión, cada cambio también se guarda en la cuenta (ver SavedSync).
let account: ((id: string, saved: boolean) => void) | null = null;
export const connectSavedAccount = (fn: typeof account) => void (account = fn);
export const readSaved = () => saved.read();
export const replaceSaved = (ids: string[]) => saved.write(ids.slice(0, MAX_SAVED));

/** Vehículos guardados (el más reciente primero). */
export function useSaved() {
  const ids = saved.useItems();
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const current = saved.read();
      const on = !current.includes(id);
      saved.write(on ? [id, ...current].slice(0, MAX_SAVED) : current.filter((x) => x !== id));
      account?.(id, on);
    },
    /** Quita los que ya no están publicados. */
    keepOnly: (live: string[]) => saved.write(saved.read().filter((id) => live.includes(id))),
  };
}

export function useRecent() {
  return recent.useItems();
}

export function recordRecent(id: string) {
  recent.write(pushRecent(recent.read(), id));
}

/**
 * Tarjetas de los vehículos publicados entre `ids`, en el mismo orden.
 * `null` mientras carga; los que ya no están publicados no vuelven.
 * Quitar ids de la lista no vuelve a consultar: se filtra lo ya cargado.
 */
export function useVehicleCards(ids: string[]) {
  const key = ids.join(",");
  const [state, setState] = useState<{ ids: string[]; items: VehicleCard[] } | null>(null);
  const covered = !!state && ids.every((id) => state.ids.includes(id));

  useEffect(() => {
    if (!key || covered) return;
    const controller = new AbortController();
    fetch(`/api/vehiculos?ids=${key}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      // Las fechas llegan como texto; la tarjeta las lee con `new Date(...)`.
      .then((data: { items: VehicleCard[] }) => setState({ ids: key.split(","), items: data.items }))
      .catch(() => {});
    return () => controller.abort();
  }, [key, covered]);

  if (!key) return [];
  return covered ? ids.flatMap((id) => state.items.find((v) => v.id === id) ?? []) : null;
}
