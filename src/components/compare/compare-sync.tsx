"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { compareUrl, type CompareItem } from "@/lib/compare";
import { useCompare } from "./use-compare";

/**
 * La URL de /comparar manda: la selección guardada se iguala a lo que muestra la página
 * (así un enlace compartido o un «Quitar» quedan reflejados). Sin `?ids`, abre la selección guardada.
 */
export function CompareSync({ items, fromUrl }: { items: CompareItem[]; fromUrl: boolean }) {
  const { items: saved, replace } = useCompare();
  const router = useRouter();
  const key = items.map((i) => i.id).join(",");
  const savedKey = saved.map((i) => i.id).join(",");

  useEffect(() => {
    if (fromUrl) replace(items);
    // Solo al cambiar lo que muestra la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fromUrl]);

  useEffect(() => {
    if (!fromUrl && savedKey) router.replace(compareUrl(savedKey.split(",")));
  }, [fromUrl, savedKey, router]);

  return null;
}
