"use client";

import { useEffect } from "react";

/** Envía el formulario al cambiar cualquier <select data-autosubmit>. */
export function AutoSubmit() {
  useEffect(() => {
    const onChange = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLSelectElement && el.dataset.autosubmit !== undefined) el.form?.requestSubmit();
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);
  return null;
}
