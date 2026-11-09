"use client";

import { useState } from "react";
import Link from "next/link";
import { button } from "@/components/ui/styles";

/** El proveedor externo no se monta antes de una elección afirmativa. */
export function MapConsent({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  if (enabled) return children;
  return (
    <div className="relative">
      {fallback}
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-surface/95 p-3 text-sm text-ink shadow-md">
        <p>Google recibirá datos técnicos, como tu IP, si cargas su mapa. Puedes seguir usando el mapa esquemático. <Link href="/legal/cookies" target="_blank" rel="noopener" className="text-brand underline">Privacidad de mapas</Link></p>
        <button type="button" onClick={() => setEnabled(true)} className={`${button("outline", "sm")} mt-2`}>Cargar Google Maps</button>
      </div>
    </div>
  );
}
