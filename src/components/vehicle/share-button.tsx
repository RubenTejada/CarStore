"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

/**
 * Compartir la ficha: en el móvil abre el menú del sistema (WhatsApp, Instagram…);
 * donde no existe, copia el enlace.
 */
export function ShareButton({ url, title, text, className }: { url: string; title: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {} // el visitante cerró el menú
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <button type="button" onClick={share} className={cn(button("outline", "md"), "flex-1")} aria-live="polite">
        {copied ? <Check className="size-5 text-ok" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
        {copied ? "Enlace copiado" : "Compartir"}
      </button>
    </div>
  );
}
