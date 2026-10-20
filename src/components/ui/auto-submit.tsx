"use client";

import { useEffect } from "react";

/** Envía el formulario al cambiar cualquier <select> o <input type="radio"> con data-autosubmit. */
export function AutoSubmit() {
  useEffect(() => {
    const onChange = (e: Event) => {
      const el = e.target as HTMLElement;
      const field = el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === "radio");
      if (field && el.dataset.autosubmit !== undefined) (el as HTMLSelectElement | HTMLInputElement).form?.requestSubmit();
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);
  return null;
}
