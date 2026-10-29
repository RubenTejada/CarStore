"use client";

import { useSyncExternalStore } from "react";

/**
 * Lista guardada en localStorage (comparador, guardados, vistos): sobrevive a la navegación,
 * se sincroniza entre pestañas y, si el almacenamiento está bloqueado, se queda en memoria durante la visita.
 */
export function createLocalList<T>(key: string, parse: (raw: string | null) => T[]) {
  const EMPTY: T[] = [];
  let cacheRaw: string | null = null;
  let cache: T[] = EMPTY;

  function read() {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cache;
    }
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = parse(raw);
    }
    return cache;
  }

  function write(items: T[]) {
    cache = items;
    cacheRaw = JSON.stringify(items);
    try {
      localStorage.setItem(key, cacheRaw);
    } catch {}
    window.dispatchEvent(new Event(key));
  }

  function subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(key, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(key, onChange);
    };
  }

  return {
    read,
    write,
    /** Lista actual; vacía durante el render del servidor. */
    useItems: () => useSyncExternalStore(subscribe, read, () => EMPTY),
  };
}
