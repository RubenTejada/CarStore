"use client";

import { useSyncExternalStore } from "react";
import { MAX_COMPARE, parseCompareItems, type CompareItem } from "@/lib/compare";

// Selección del comparador: vive en localStorage para sobrevivir a la navegación y se sincroniza entre pestañas.
const KEY = "carstore:comparar";
const EVENT = "carstore:comparar";
const EMPTY: CompareItem[] = [];

let cacheRaw: string | null = null;
let cache: CompareItem[] = EMPTY;

function read() {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache; // almacenamiento bloqueado: se queda en memoria durante la visita
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = parseCompareItems(raw);
  }
  return cache;
}

function write(items: CompareItem[]) {
  cache = items.slice(0, MAX_COMPARE);
  cacheRaw = JSON.stringify(cache);
  try {
    localStorage.setItem(KEY, cacheRaw);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    full: items.length >= MAX_COMPARE,
    has: (id: string) => items.some((i) => i.id === id),
    toggle: (item: CompareItem) => {
      const current = read();
      if (current.some((i) => i.id === item.id)) write(current.filter((i) => i.id !== item.id));
      else if (current.length < MAX_COMPARE) write([...current, item]);
    },
    remove: (id: string) => write(read().filter((i) => i.id !== id)),
    replace: write,
  };
}
