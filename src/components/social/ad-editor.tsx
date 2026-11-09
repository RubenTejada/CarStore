"use client";

import { useMemo, useState, useTransition } from "react";
import { AlignCenter, AlignLeft, Download, ImageIcon, LayoutTemplate, Loader2, Palette, RotateCcw, Save, Send, Sparkles, Type, Undo2, Wand2 } from "lucide-react";
import { publishVehicleAd, resetVehicleAd, saveDefaultAd, saveVehicleAd, suggestCaption, type CaptionTone } from "@/app/actions/social";
import { BODY_FONTS, FONTS, FORMATS, PALETTES, TEMPLATE_IDS, adPhotos, type AdData, type AdDesign, type FontId, type FormatId } from "@/lib/social/design";
import { CAPTION_MAX, PLACEHOLDERS, fillCaption, socialLink } from "@/lib/social/caption";
import { TEMPLATES } from "@/lib/social/templates";
import { cn } from "@/lib/cn";
import { button, card, input, label } from "@/components/ui/styles";
import { AdPreview } from "./ad-preview";

type Network = "FACEBOOK" | "INSTAGRAM";
type Tab = "plantilla" | "fotos" | "textos" | "estilo" | "publicacion";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "plantilla", label: "Plantilla", icon: <LayoutTemplate className="size-4" aria-hidden /> },
  { id: "fotos", label: "Fotos", icon: <ImageIcon className="size-4" aria-hidden /> },
  { id: "textos", label: "Textos", icon: <Type className="size-4" aria-hidden /> },
  { id: "estilo", label: "Estilo", icon: <Palette className="size-4" aria-hidden /> },
  { id: "publicacion", label: "Publicación", icon: <Send className="size-4" aria-hidden /> },
];

const BADGES = ["Recién llegado", "Oferta", "Precio especial", "Como nuevo", "Único dueño", "Financiamiento disponible", "Garantía", "¡Vendido!"];
const CTAS = ["Escríbenos por WhatsApp", "Agenda tu prueba de manejo", "Llámanos hoy", "Pregunta por financiamiento", "Visítanos en {provincia}"];
const SHOW_LABELS: Record<keyof AdDesign["show"], string> = {
  price: "Precio",
  priceBefore: "Precio anterior (rebaja)",
  specs: "Datos (año, km, transmisión, combustible)",
  logo: "Logo del dealer",
  badge: "Etiqueta",
  cta: "Llamada a la acción",
  contact: "Teléfono",
  financing: "«Financiamiento disponible»",
};
const TONES: { id: CaptionTone; label: string }[] = [
  { id: "vendedor", label: "Vendedor" },
  { id: "cercano", label: "Cercano" },
  { id: "formal", label: "Formal" },
  { id: "lujo", label: "Premium" },
];

export type PublishTarget = { pageName: string | null; igUsername: string | null; ready: boolean; reason?: string };

export function AdEditor({
  mode,
  vehicleId,
  data,
  portalUrl,
  initialDesign,
  initialCaption,
  target,
  aiCaption,
  customized,
}: {
  mode: "vehicle" | "default";
  vehicleId?: string;
  data: AdData;
  portalUrl: string;
  initialDesign: AdDesign;
  initialCaption: string;
  target: PublishTarget;
  aiCaption: boolean;
  customized?: boolean;
}) {
  const [design, setDesignState] = useState(initialDesign);
  const [history, setHistory] = useState<AdDesign[]>([]);
  const [caption, setCaption] = useState(initialCaption);
  const [tab, setTab] = useState<Tab>("plantilla");
  const [networks, setNetworks] = useState<Network[]>(["FACEBOOK", ...(target.igUsername ? (["INSTAGRAM"] as const) : [])]);
  const [preview, setPreview] = useState<Network>("FACEBOOK");
  const [tone, setTone] = useState<CaptionTone>("vendedor");
  const [message, setMessage] = useState<{ ok?: string; error?: string; links?: { network: string; url: string }[] }>();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"download" | "ai" | null>(null);

  const setDesign = (patch: Partial<AdDesign> | ((d: AdDesign) => Partial<AdDesign>)) => {
    setHistory((h) => [...h.slice(-49), design]);
    setDesignState((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  };
  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setDesignState(last);
  };

  const slotCount = TEMPLATES[design.template].slots(FORMATS[design.format].width, FORMATS[design.format].height).length;
  const usedPhotos = adPhotos(design, data, slotCount);
  const filledCaption = useMemo(() => fillCaption(caption, data, socialLink(portalUrl, preview)), [caption, data, portalUrl, preview]);

  const run = (fn: () => Promise<{ ok?: string; error?: string } | undefined>) =>
    start(async () => {
      setMessage(undefined);
      setMessage((await fn()) ?? undefined);
    });

  const save = () => run(() => (mode === "vehicle" ? saveVehicleAd(vehicleId!, { design, caption }) : saveDefaultAd({ design, caption })));

  const publish = () =>
    start(async () => {
      setMessage(undefined);
      const res = await publishVehicleAd(vehicleId!, { design, caption, networks });
      setMessage({
        ok: res.ok,
        error: res.error,
        links: res.results?.flatMap((r) => (r.ok && r.permalink ? [{ network: r.network === "FACEBOOK" ? "Facebook" : "Instagram", url: r.permalink }] : [])),
      });
    });

  async function download() {
    setBusy("download");
    setMessage(undefined);
    try {
      const res = await fetch("/api/social/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId, design }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "No se pudo generar la imagen.");
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "anuncio.jpg";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage({ error: e instanceof Error ? e.message : "No se pudo generar la imagen." });
    } finally {
      setBusy(null);
    }
  }

  async function writeWithAi() {
    if (!vehicleId) return;
    setBusy("ai");
    setMessage(undefined);
    const res = await suggestCaption(vehicleId, tone);
    setBusy(null);
    if (res.text) setCaption(res.text);
    else setMessage({ error: res.error });
  }

  const togglePhoto = (url: string) =>
    setDesign((d) => {
      const current = adPhotos(d, data, slotCount);
      return { photos: d.photos.includes(url) ? d.photos.filter((p) => p !== url) : [...d.photos.filter((p) => current.includes(p)), url].slice(-4) };
    });
  const makeMain = (url: string) => setDesign((d) => ({ photos: [url, ...adPhotos(d, data, 4).filter((p) => p !== url)], zoom: 1, focusX: 50, focusY: 50 }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      {/* Vista previa */}
      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Formato" className="flex rounded-lg border border-line bg-surface p-1">
            {(Object.keys(FORMATS) as FormatId[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={design.format === f}
                onClick={() => setDesign({ format: f })}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", design.format === f ? "bg-ink text-surface" : "text-muted hover:text-ink")}
                title={FORMATS[f].hint}
              >
                {FORMATS[f].label}
              </button>
            ))}
          </div>
          <button type="button" onClick={undo} disabled={!history.length} className={button("ghost", "sm")}>
            <Undo2 className="size-4" aria-hidden /> Deshacer
          </button>
        </div>

        <div className={cn(card, "mx-auto overflow-hidden", design.format === "story" ? "max-w-sm" : "max-w-xl")}>
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-bold">{data.dealerName.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 text-sm leading-tight">
              <p className="truncate font-semibold">{preview === "INSTAGRAM" ? (target.igUsername ?? data.dealerName) : (target.pageName ?? data.dealerName)}</p>
              <p className="text-xs text-muted">{preview === "INSTAGRAM" ? "Instagram" : "Facebook"} · vista previa</p>
            </div>
            <div className="ml-auto flex rounded-md border border-line text-xs">
              {(["FACEBOOK", "INSTAGRAM"] as const).map((n) => (
                <button key={n} type="button" aria-pressed={preview === n} onClick={() => setPreview(n)} className={cn("px-2 py-1", preview === n ? "bg-surface-2 font-semibold" : "text-muted")}>
                  {n === "FACEBOOK" ? "FB" : "IG"}
                </button>
              ))}
            </div>
          </div>
          {preview === "FACEBOOK" && design.format !== "story" && <p className="line-clamp-3 px-4 py-2.5 text-sm whitespace-pre-line">{filledCaption}</p>}
          <AdPreview design={design} data={data} onPick={tab === "fotos" ? (x, y) => setDesign({ focusX: x, focusY: y }) : undefined} />
          {preview === "INSTAGRAM" && design.format !== "story" && (
            <p className="line-clamp-3 px-4 py-2.5 text-sm whitespace-pre-line">
              <span className="font-semibold">{target.igUsername ?? data.dealerName}</span> {filledCaption}
            </p>
          )}
        </div>
        {tab === "fotos" && <p className="mt-2 text-center text-sm text-muted">Toca la vista previa para elegir el punto que queda centrado en la foto principal.</p>}
      </div>

      {/* Controles */}
      <div className="min-w-0">
        <div role="tablist" aria-label="Opciones del anuncio" className="scrollbar-none mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", tab === t.id ? "bg-brand text-brand-ink" : "text-muted hover:text-ink")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className={cn(card, "p-5")} role="tabpanel">
          {tab === "plantilla" && (
            <div>
              <p className="mb-3 text-sm text-muted">Elige un punto de partida; luego ajusta fotos, textos y colores.</p>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={design.template === id}
                    onClick={() => setDesign({ template: id })}
                    className={cn("overflow-hidden rounded-lg border text-left transition", design.template === id ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-ink")}
                  >
                    <AdPreview design={{ ...design, template: id, format: "square" }} data={data} />
                    <span className="block px-2.5 pt-2 text-sm font-semibold">{TEMPLATES[id].label}</span>
                    <span className="block px-2.5 pb-2.5 text-xs text-muted">{TEMPLATES[id].description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "fotos" && (
            <div className="space-y-5">
              {data.photos.length ? (
                <div>
                  <p className="mb-2 text-sm text-muted">
                    Esta plantilla usa {slotCount === 1 ? "1 foto" : `${slotCount} fotos`}. Toca para incluir o quitar; la estrella la hace principal.
                  </p>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {data.photos.map((url) => {
                      const pos = usedPhotos.indexOf(url);
                      return (
                        <li key={url} className="relative">
                          <button type="button" onClick={() => togglePhoto(url)} aria-pressed={pos >= 0} className={cn("block aspect-square w-full overflow-hidden rounded-lg border-2", pos >= 0 ? "border-brand" : "border-transparent opacity-70 hover:opacity-100")}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una foto del vehículo */}
                            <img src={url} alt={`Foto ${data.photos.indexOf(url) + 1}`} className="size-full object-cover" />
                          </button>
                          {pos >= 0 && <span className="pointer-events-none absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">{pos + 1}</span>}
                          {pos !== 0 && (
                            <button type="button" onClick={() => makeMain(url)} className="absolute right-1 bottom-1 rounded-full bg-night/75 px-2 py-0.5 text-xs text-white" title="Usar como foto principal">
                              ★
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted">Este vehículo aún no tiene fotos.</p>
              )}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">Encuadre de la foto principal</legend>
                <Slider label="Zoom" min={1} max={3} step={0.05} value={design.zoom} onChange={(zoom) => setDesign({ zoom })} format={(v) => `${v.toFixed(2)}×`} />
                <Slider label="Horizontal" min={0} max={100} value={design.focusX} onChange={(focusX) => setDesign({ focusX })} format={(v) => `${v}%`} />
                <Slider label="Vertical" min={0} max={100} value={design.focusY} onChange={(focusY) => setDesign({ focusY })} format={(v) => `${v}%`} />
                <button type="button" onClick={() => setDesign({ zoom: 1, focusX: 50, focusY: 50 })} className={button("ghost", "sm")}>
                  <RotateCcw className="size-4" aria-hidden /> Centrar
                </button>
              </fieldset>
              <Slider label="Velo oscuro bajo el texto" min={0} max={95} value={design.overlay} onChange={(overlay) => setDesign({ overlay })} format={(v) => `${v}%`} />
            </div>
          )}

          {tab === "textos" && (
            <div className="space-y-4">
              <Field id="ad-headline" label="Título" value={design.headline} max={80} onChange={(headline) => setDesign({ headline })} />
              <Field id="ad-sub" label="Subtítulo" value={design.subheadline} max={80} onChange={(subheadline) => setDesign({ subheadline })} />
              <div>
                <Field id="ad-badge" label="Etiqueta" value={design.badge} max={30} onChange={(badge) => setDesign({ badge })} />
                <Chips items={BADGES} onPick={(badge) => setDesign({ badge, show: { ...design.show, badge: true } })} />
              </div>
              <div>
                <Field id="ad-cta" label="Llamada a la acción" value={design.cta} max={60} onChange={(cta) => setDesign({ cta })} />
                <Chips items={CTAS} onPick={(cta) => setDesign({ cta, show: { ...design.show, cta: true } })} />
              </div>
              <p className="text-xs text-muted">
                Marcadores: {"{titulo} {año} {version} {precio} {km} {provincia} {dealer} {telefono}"} se completan con los datos de cada vehículo.
              </p>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Mostrar en la imagen</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(SHOW_LABELS) as (keyof AdDesign["show"])[]).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4" checked={design.show[k]} onChange={(e) => setDesign({ show: { ...design.show, [k]: e.target.checked } })} />
                      {SHOW_LABELS[k]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {tab === "estilo" && (
            <div className="space-y-5">
              <FontPicker title="Tipografía del título" fonts={Object.keys(FONTS) as FontId[]} value={design.headingFont} onChange={(headingFont) => setDesign({ headingFont })} weight="heading" />
              <FontPicker title="Tipografía del texto" fonts={BODY_FONTS} value={design.bodyFont} onChange={(bodyFont) => setDesign({ bodyFont })} weight="body" />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={design.uppercase} onChange={(e) => setDesign({ uppercase: e.target.checked })} />
                  Título en mayúsculas
                </label>
                <div role="radiogroup" aria-label="Alineación" className="flex rounded-lg border border-line p-0.5">
                  {(["left", "center"] as const).map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={design.align === a} aria-label={a === "left" ? "Alinear a la izquierda" : "Centrar"} onClick={() => setDesign({ align: a })} className={cn("rounded-md p-1.5", design.align === a ? "bg-surface-2" : "text-muted")}>
                      {a === "left" ? <AlignLeft className="size-4" /> : <AlignCenter className="size-4" />}
                    </button>
                  ))}
                </div>
              </div>
              <Slider label="Tamaño del texto" min={0.7} max={1.4} step={0.05} value={design.textScale} onChange={(textScale) => setDesign({ textScale })} format={(v) => `${Math.round(v * 100)}%`} />
              <div>
                <p className="mb-2 text-sm font-semibold">Combinaciones de colores</p>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTES.map((p) => {
                    const active = JSON.stringify(p.colors) === JSON.stringify(design.colors);
                    return (
                      <button key={p.id} type="button" aria-pressed={active} onClick={() => setDesign({ colors: p.colors })} className={cn("flex items-center gap-2 rounded-lg border p-2 text-left text-sm", active ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-ink")}>
                        <span className="flex overflow-hidden rounded-md border border-line">
                          <span className="size-6" style={{ background: p.colors.bg }} />
                          <span className="size-6" style={{ background: p.colors.accent }} />
                          <span className="size-6" style={{ background: p.colors.text }} />
                        </span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Colores personalizados</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["bg", "Fondo"],
                      ["accent", "Acento (precio, botones)"],
                      ["text", "Texto"],
                      ["accentText", "Texto sobre el acento"],
                    ] as const
                  ).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="color" value={design.colors[k]} onChange={(e) => setDesign({ colors: { ...design.colors, [k]: e.target.value } })} className="h-9 w-12 cursor-pointer rounded border border-line bg-surface" />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {tab === "publicacion" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ad-caption" className={label}>
                  Texto de la publicación
                </label>
                <textarea id="ad-caption" value={caption} maxLength={CAPTION_MAX} onChange={(e) => setCaption(e.target.value)} rows={10} className={cn(input, "h-auto py-2.5 font-mono text-sm leading-relaxed")} />
                <p className="mt-1 text-right text-xs text-muted">
                  {filledCaption.length.toLocaleString("es-DO")} / {CAPTION_MAX.toLocaleString("es-DO")} caracteres
                </p>
                <Chips items={PLACEHOLDERS.map((p) => `{${p.key}}`)} titles={PLACEHOLDERS.map((p) => p.label)} onPick={(token) => setCaption((c) => `${c}${c.endsWith(" ") || c.endsWith("\n") || !c ? "" : " "}${token}`)} />
                <p className="mt-2 text-xs text-muted">En Instagram los enlaces del texto no se pueden tocar: menciona «enlace en la bio» si lo necesitas. Las historias de Instagram no llevan texto.</p>
              </div>
              {mode === "vehicle" && aiCaption && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3">
                  <Sparkles className="size-4 text-brand" aria-hidden />
                  <span className="text-sm font-medium">Redactar con IA</span>
                  <select value={tone} onChange={(e) => setTone(e.target.value as CaptionTone)} aria-label="Tono" className={cn(input, "h-9 w-auto")}>
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={writeWithAi} disabled={busy === "ai"} className={button("outline", "sm")}>
                    {busy === "ai" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />} Redactar
                  </button>
                </div>
              )}
              {mode === "vehicle" && (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Publicar en</legend>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="size-4" disabled={!target.pageName} checked={networks.includes("FACEBOOK")} onChange={(e) => setNetworks((n) => (e.target.checked ? [...n, "FACEBOOK"] : n.filter((x) => x !== "FACEBOOK")))} />
                      Facebook {target.pageName ? `· ${target.pageName}` : "(sin conectar)"}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="size-4" disabled={!target.igUsername} checked={networks.includes("INSTAGRAM")} onChange={(e) => setNetworks((n) => (e.target.checked ? [...n, "INSTAGRAM"] : n.filter((x) => x !== "INSTAGRAM")))} />
                      Instagram {target.igUsername ? `· @${target.igUsername}` : "(sin cuenta profesional vinculada)"}
                      {design.format === "story" && target.igUsername ? " · como historia" : ""}
                    </label>
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending} className={button("outline")}>
            <Save className="size-4" aria-hidden /> {mode === "vehicle" ? "Guardar anuncio" : "Guardar diseño por defecto"}
          </button>
          <button type="button" onClick={download} disabled={busy === "download"} className={button("outline")}>
            {busy === "download" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} Descargar imagen
          </button>
          {mode === "vehicle" && (
            <button type="button" onClick={publish} disabled={pending || !target.ready || !networks.length} className={button("primary")} title={target.reason}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Publicar ahora
            </button>
          )}
          {mode === "vehicle" && customized && (
            <button type="button" onClick={() => run(() => resetVehicleAd(vehicleId!).then((r) => (r?.ok && window.location.reload(), r)))} disabled={pending} className={button("ghost")}>
              <RotateCcw className="size-4" aria-hidden /> Usar diseño del dealer
            </button>
          )}
        </div>
        {mode === "vehicle" && !target.ready && target.reason && <p className="mt-2 text-sm text-muted">{target.reason}</p>}
        <div aria-live="polite">
          {message?.error && <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">{message.error}</p>}
          {message?.ok && <p className="mt-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm">{message.ok}</p>}
          {message?.links?.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-semibold text-brand hover:underline">
              Ver en {l.network}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slider({ label: text, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format: (v: number) => string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between">
        <span>{text}</span>
        <span className="text-muted tabular-nums">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-brand)]" />
    </label>
  );
}

function Field({ id, label: text, value, onChange, max }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input id={id} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className={input} />
    </div>
  );
}

function Chips({ items, titles, onPick }: { items: string[]; titles?: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <button key={item} type="button" title={titles?.[i]} onClick={() => onPick(item)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink">
          {item}
        </button>
      ))}
    </div>
  );
}

function FontPicker({ title, fonts, value, onChange, weight }: { title: string; fonts: FontId[]; value: FontId; onChange: (f: FontId) => void; weight: "heading" | "body" }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fonts.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value === f}
            onClick={() => onChange(f)}
            className={cn("truncate rounded-lg border px-2 py-2 text-left text-lg", value === f ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-ink")}
            style={{ fontFamily: FONTS[f].family, fontWeight: weight === "heading" ? FONTS[f].heading : 500 }}
          >
            {FONTS[f].label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
