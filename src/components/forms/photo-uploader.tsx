"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

async function upload(file: File, kind: string) {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo subir la foto.");
  return json.url;
}

/** Galería editable: subir varias fotos, reordenar (la primera es la portada) y eliminar. */
export function PhotoUploader({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const [photos, setPhotos] = useState(defaultValue);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, 30 - photos.length);
    setUploading(list.length);
    for (const file of list) {
      try {
        const url = await upload(file, "vehicle");
        setPhotos((p) => [...p, url]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      }
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (i: number, d: number) =>
    setPhotos((p) => {
      const next = [...p];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <div>
      {photos.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((url, i) => (
          <li key={url} className="group relative aspect-[3/2] overflow-hidden rounded-lg border border-line bg-surface-2">
            <Image src={url} alt={`Foto ${i + 1}`} fill sizes="240px" className="object-cover" />
            {i === 0 && <span className="absolute top-2 left-2 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white">Portada</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 p-1.5">
              <span className="flex gap-1">
                <IconBtn label="Mover a la izquierda" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronLeft className="size-4" />
                </IconBtn>
                <IconBtn label="Mover a la derecha" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                  <ChevronRight className="size-4" />
                </IconBtn>
              </span>
              <IconBtn label="Eliminar foto" onClick={() => setPhotos((p) => p.filter((x) => x !== url))}>
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`u${i}`} className="grid aspect-[3/2] place-items-center rounded-lg border border-line bg-surface-2">
            <LoaderCircle className="size-6 animate-spin text-muted" aria-label="Subiendo" />
          </li>
        ))}
        {photos.length < 30 && (
          <li>
            <label className="flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand">
              <ImagePlus className="size-6" aria-hidden />
              Agregar fotos
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      <p className={cn("mt-2 text-sm", error ? "font-medium text-accent" : "text-muted")} role={error ? "alert" : undefined}>
        {error ?? "JPG, PNG o WebP hasta 10 MB. La primera foto es la portada."}
      </p>
    </div>
  );
}

/** Imagen única (logo o portada del dealer). */
export function SingleImageField({ name, kind, defaultValue, label }: { name: string; kind: "logo" | "cover"; defaultValue: string | null; label: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />
      <div className="flex items-center gap-4">
        <div className={cn("relative shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2", kind === "logo" ? "size-20" : "h-20 w-36")}>
          {url && <Image src={url} alt="" fill sizes="160px" className={kind === "logo" ? "object-contain p-1" : "object-cover"} />}
          {busy && <LoaderCircle className="absolute inset-0 m-auto size-6 animate-spin text-muted" aria-label="Subiendo" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-ink">
            {url ? `Cambiar ${label}` : `Subir ${label}`}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError(null);
                try {
                  setUrl(await upload(file, kind));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo subir.");
                }
                setBusy(false);
              }}
            />
          </label>
          {url && (
            <button type="button" onClick={() => setUrl(null)} className="rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10">
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-md bg-white/90 text-night hover:bg-white disabled:opacity-30">
      {children}
    </button>
  );
}
