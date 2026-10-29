"use client";

import { useEffect } from "react";
import { setSaved, syncSaved } from "@/app/actions/saved";
import { connectSavedAccount, readSaved, replaceSaved } from "./use-saved";

const MERGED_KEY = "carstore:guardados-cuenta";

/**
 * Con sesión, los guardados viven en la cuenta. La primera vez en este navegador se suman los que
 * ya tenía guardados aquí; después la cuenta manda (así un vehículo quitado en otro dispositivo no vuelve).
 */
export function SavedSync({ userId }: { userId: string }) {
  useEffect(() => {
    let merged = false;
    try {
      merged = localStorage.getItem(MERGED_KEY) === userId;
    } catch {}
    let cancelled = false;
    syncSaved(merged ? [] : readSaved())
      .then((ids) => {
        if (!ids || cancelled) return;
        replaceSaved(ids);
        try {
          localStorage.setItem(MERGED_KEY, userId);
        } catch {}
      })
      .catch(() => {});
    connectSavedAccount((id, on) => void setSaved(id, on).catch(() => {}));
    return () => {
      cancelled = true;
      connectSavedAccount(null);
    };
  }, [userId]);
  return null;
}
