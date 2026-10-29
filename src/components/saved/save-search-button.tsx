"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
import { saveSearch } from "@/app/actions/saved";
import { cn } from "@/lib/cn";

const chip = "flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-3 text-sm font-semibold";

/** «Crear alerta» para la búsqueda actual: sin sesión lleva a crear una cuenta de comprador y vuelve aquí. */
export function SaveSearchButton({ query, name, state }: { query: string; name: string; state: "anon" | "new" | "saved" }) {
  const [saved, setSaved] = useState(state === "saved");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  if (state === "anon")
    return (
      <Link href={`/registro?tipo=comprador&siguiente=${encodeURIComponent(`/vehiculos?${query}`)}`} className={cn(chip, "bg-brand text-brand-ink hover:brightness-110")}>
        <Bell className="size-4" aria-hidden />
        Crear alerta
      </Link>
    );
  if (saved)
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Link href="/cuenta" className={cn(chip, "bg-ok/15 text-ok")}>
          <BellRing className="size-4" aria-hidden />
          Alerta activa
        </Link>
        {message && (
          <span role="status" className="text-sm text-muted">
            {message}
          </span>
        )}
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveSearch(query, name);
            setMessage(r?.error ?? r?.ok ?? "");
            if (r?.ok) setSaved(true);
          })
        }
        className={cn(chip, "bg-brand text-brand-ink hover:brightness-110 disabled:opacity-60")}
      >
        <Bell className="size-4" aria-hidden />
        {pending ? "Creando…" : "Crear alerta"}
      </button>
      {message && (
        <span role="alert" className="text-sm text-accent">
          {message}
        </span>
      )}
    </span>
  );
}
