"use client";

import { useState } from "react";
import { Armchair, LoaderCircle, Rotate3d } from "lucide-react";
import { SPIN_MAX_FRAMES, SPIN_MIN_FRAMES } from "@/lib/labels";
import { SpinViewer } from "@/components/vehicle/spin-viewer";
import { PanoViewer } from "@/components/vehicle/pano-viewer";
import { upload } from "./photo-uploader";

const fileButton = "cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-ink";
const removeButton = "rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10";

/**
 * Vista 360 del anuncio: el giro exterior (una secuencia de fotos tomadas alrededor del auto, ordenadas
 * por nombre de archivo) y el panorama del interior (una foto equirectangular de una cámara 360).
 */
export function View360Uploader({ spinFrames, interiorPano }: { spinFrames: string[]; interiorPano: string | null }) {
  const [frames, setFrames] = useState(spinFrames);
  const [pano, setPano] = useState(interiorPano);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [panoBusy, setPanoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadSpin = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (list.length < SPIN_MIN_FRAMES || list.length > SPIN_MAX_FRAMES) {
      setError(`Selecciona entre ${SPIN_MIN_FRAMES} y ${SPIN_MAX_FRAMES} fotos para el giro (elegiste ${list.length}).`);
      return;
    }
    setError(null);
    setProgress({ done: 0, total: list.length });
    const urls: string[] = [];
    try {
      for (const file of list) {
        urls.push(await upload(file, "vehicle"));
        setProgress({ done: urls.length, total: list.length });
      }
      setFrames(urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el giro.");
    }
    setProgress(null);
  };

  const uploadPano = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPanoBusy(true);
    try {
      setPano(await upload(file, "pano"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el interior.");
    }
    setPanoBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {frames.map((url) => (
        <input key={url} type="hidden" name="spinFrames" value={url} />
      ))}
      <input type="hidden" name="interiorPano" value={pano ?? ""} />

      <div>
        <h3 className="flex items-center gap-2 font-bold">
          <Rotate3d className="size-5 text-brand" aria-hidden />
          Giro exterior
        </h3>
        <p className="mt-1 text-sm text-muted">
          {SPIN_MIN_FRAMES} a {SPIN_MAX_FRAMES} fotos tomadas alrededor del vehículo a la misma distancia y altura, siempre en el mismo sentido. Se ordenan por nombre de archivo.
        </p>
        <div className="mt-3 aspect-[3/2] overflow-hidden rounded-lg border border-line bg-surface-2">
          {progress ? (
            <p className="grid size-full place-items-center text-sm font-semibold text-muted">
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
                Subiendo {progress.done} de {progress.total}
              </span>
            </p>
          ) : frames.length ? (
            <SpinViewer key={frames[0]} frames={frames} alt="Tu vehículo" interactive sizes="(min-width: 1024px) 30vw, 100vw" className="size-full" />
          ) : (
            <p className="grid size-full place-items-center text-sm text-muted">Sin giro 360</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={fileButton}>
            {frames.length ? "Reemplazar giro" : "Subir fotos del giro"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={!!progress}
              className="sr-only"
              onChange={(e) => {
                uploadSpin(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {frames.length > 0 && !progress && (
            <button type="button" onClick={() => setFrames([])} className={removeButton}>
              Quitar giro
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 font-bold">
          <Armchair className="size-5 text-brand" aria-hidden />
          Interior 360°
        </h3>
        <p className="mt-1 text-sm text-muted">Una foto de cámara 360 tomada desde el asiento del conductor, en formato equirectangular (proporción 2:1), hasta 30 MB.</p>
        <div className="mt-3 aspect-[3/2] overflow-hidden rounded-lg border border-line bg-surface-2">
          {panoBusy ? (
            <p className="grid size-full place-items-center text-sm font-semibold text-muted">
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
                Subiendo panorama
              </span>
            </p>
          ) : pano ? (
            <PanoViewer key={pano} src={pano} alt="Tu vehículo" autoplay={false} className="size-full" />
          ) : (
            <p className="grid size-full place-items-center text-sm text-muted">Sin interior 360</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={fileButton}>
            {pano ? "Reemplazar interior" : "Subir interior 360"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={panoBusy}
              className="sr-only"
              onChange={(e) => {
                uploadPano(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {pano && !panoBusy && (
            <button type="button" onClick={() => setPano(null)} className={removeButton}>
              Quitar interior
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-accent lg:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}
