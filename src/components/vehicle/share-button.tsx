"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { siWhatsapp } from "simple-icons";
import { button } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

/**
 * Compartir la ficha: en el móvil abre el menú del sistema (WhatsApp, Instagram…);
 * donde no existe, copia el enlace. Al lado, el atajo directo a WhatsApp.
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
      <button type="button" onClick={share} className={cn(button("outline", "lg"), "flex-1")} aria-live="polite">
        {copied ? <Check className="size-5 text-ok" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
        {copied ? "Enlace copiado" : "Compartir"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button("outline", "lg")}
        aria-label="Compartir por WhatsApp"
        title="Compartir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d={siWhatsapp.path} fill={`#${siWhatsapp.hex}`} />
        </svg>
      </a>
    </div>
  );
}
