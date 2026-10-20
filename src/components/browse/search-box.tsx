"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { KIND_LABEL, fromParams, normalize, prepareIndex, suggest, toHref, type PreparedIndex, type SearchIndex, type Suggestion } from "@/lib/search-suggest";
import { cn } from "@/lib/cn";
import { BodySilhouette } from "./body-silhouette";
import { BrandLogo } from "./brand-logo";

// Un solo índice por visita, compartido por todos los buscadores de la página.
let loaded: PreparedIndex | null = null;
let pending: Promise<PreparedIndex> | null = null;
function loadIndex() {
  pending ??= fetch("/api/search-index")
    .then((r) => {
      if (!r.ok) throw new Error(`search-index ${r.status}`);
      return r.json() as Promise<SearchIndex>;
    })
    .then((raw) => (loaded = prepareIndex(raw)))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

type Props = {
  /** Filtros vigentes (parámetros de /vehiculos) que la búsqueda conserva. */
  params?: Record<string, string>;
  defaultValue?: string;
  tone?: "dark" | "light";
  placeholder?: string;
  className?: string;
};

/**
 * Buscador con autocompletado: entiende marca, modelo, versión, tipo, condición, combustible,
 * transmisión y año, y lleva a /vehiculos con esos filtros. Sin JS envía `q` como búsqueda libre.
 */
export function SearchBox({ params = {}, defaultValue = "", tone = "light", placeholder = "Marca, modelo, versión o tipo: Corolla 2020", className }: Props) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [index, setIndex] = useState(loaded);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const items: Suggestion[] = index ? suggest(index, query, params) : [];
  const text = query.trim();
  const current = open ? items[active] : undefined;

  const ensureIndex = () => {
    if (!index) loadIndex().then(setIndex, () => {});
  };
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const freeText = () => {
    const { filters, rest } = fromParams(params);
    return toHref(filters, rest, text || undefined);
  };

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + items.length) % items.length);
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else setQuery("");
    }
  };

  return (
    <form
      role="search"
      action="/vehiculos"
      method="get"
      className={cn("relative z-30", className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(current?.href ?? freeText());
      }}
    >
      {Object.entries(params).map(([k, v]) => (k === "q" || k === "pagina" ? null : <input key={k} type="hidden" name={k} value={v} />))}
      <Search
        className={cn("pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2", tone === "dark" ? "text-white/60" : "text-muted")}
        aria-hidden
      />
      <input
        name="q"
        type="search"
        value={query}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label="Buscar vehículos"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-activedescendant={current ? `${listId}-${active}` : undefined}
        onPointerEnter={ensureIndex}
        onFocus={() => {
          ensureIndex();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "h-13 w-full rounded-xl border pr-4 pl-12 text-base focus:outline-none [&::-webkit-search-cancel-button]:hidden",
          tone === "dark"
            ? "border-white/15 bg-white/10 text-white placeholder:text-white/55 focus:border-white/50"
            : "border-line bg-surface text-ink placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20",
        )}
      />
      <p className="sr-only" aria-live="polite">
        {open && text ? (items.length === 1 ? "1 sugerencia" : `${items.length} sugerencias`) : ""}
      </p>

      {open && items.length > 0 && (
        <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-2xl">
          {!text && <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Con más vehículos</p>}
          <ul id={listId} role="listbox" aria-label="Sugerencias" className="max-h-[min(28rem,65vh)] overflow-y-auto p-1.5">
            {items.map((s, i) => (
              <li
                key={s.href + s.kind}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // Evita que el input pierda el foco (y cierre la lista) antes del clic.
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setActive(i)}
                onClick={() => go(s.href)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2", i === active && "bg-surface-2")}
              >
                <SuggestionIcon s={s} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{s.kind === "text" ? <>Buscar “{s.title}”</> : <Highlight text={s.title} query={query} />}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.kind === "text" ? "En marcas, modelos, versiones y años" : s.meta.join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{KIND_LABEL[s.kind]}</span>
                  {s.count !== null && <span className="block text-sm font-semibold">{s.count === 1 ? "1 vehículo" : `${s.count.toLocaleString("es-DO")} vehículos`}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="hidden gap-4 border-t border-line px-4 py-2 text-xs text-muted sm:flex">
            <span>↑ ↓ para moverte</span>
            <span>Enter para ver</span>
            <span>Esc para cerrar</span>
          </p>
        </div>
      )}
    </form>
  );
}

function SuggestionIcon({ s }: { s: Suggestion }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
      {s.kind === "text" ? (
        <Search className="size-5" aria-hidden />
      ) : s.brand ? (
        <BrandLogo brand={s.brand} colored className="size-7 text-ink" />
      ) : s.bodyType ? (
        <BodySilhouette type={s.bodyType} className="h-4 w-9" />
      ) : (
        <SlidersHorizontal className="size-5" aria-hidden />
      )}
    </span>
  );
}

/** Resalta en cada palabra el comienzo que coincide con lo escrito. */
function Highlight({ text, query }: { text: string; query: string }) {
  const typed = normalize(query).split(" ").filter(Boolean);
  return (
    <span className="font-medium">
      {text.split(/(\s+)/).map((word, i) => {
        const w = normalize(word).replace(/ /g, "");
        const hit = typed.filter((t) => w.startsWith(t)).sort((a, b) => b.length - a.length)[0];
        return hit ? (
          <span key={i}>
            <span className="font-extrabold">{word.slice(0, hit.length)}</span>
            {word.slice(hit.length)}
          </span>
        ) : (
          word
        );
      })}
    </span>
  );
}
