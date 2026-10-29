"use client";

import { createLocalList } from "@/lib/local-list";
import { MAX_COMPARE, parseCompareItems, type CompareItem } from "@/lib/compare";

// Selección del comparador: vive en localStorage para sobrevivir a la navegación y se sincroniza entre pestañas.
const store = createLocalList("carstore:comparar", parseCompareItems);
const write = (items: CompareItem[]) => store.write(items.slice(0, MAX_COMPARE));

export function useCompare() {
  const items = store.useItems();
  return {
    items,
    full: items.length >= MAX_COMPARE,
    has: (id: string) => items.some((i) => i.id === id),
    toggle: (item: CompareItem) => {
      const current = store.read();
      if (current.some((i) => i.id === item.id)) write(current.filter((i) => i.id !== item.id));
      else if (current.length < MAX_COMPARE) write([...current, item]);
    },
    remove: (id: string) => write(store.read().filter((i) => i.id !== id)),
    replace: write,
  };
}
