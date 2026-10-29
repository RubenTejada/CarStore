import type { BodyType, Condition, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";
import { BODY_TYPES, CONDITION_LABEL, DRIVETRAIN_LABEL, FUEL_LABEL, TRANSMISSION_LABEL } from "@/lib/labels";

/**
 * Autocompletado del buscador. Todo corre en el navegador sobre un índice precalculado
 * (`getSearchIndex` en catalog.ts, servido por /api/search-index): marcas, modelos y versiones
 * con inventario, más el stock publicado por combinación de filtros para dar conteos exactos.
 *
 * El texto se interpreta como filtros de /vehiculos: "jeepeta toyota usada 4x4 2020" → tipo, marca,
 * condición, tracción y año. La última palabra (aún escribiéndose) se completa contra el vocabulario.
 */

export type SearchIndex = {
  brands: { slug: string; name: string; color: string | null; logo: { path: string; hex: string } | null }[];
  /** `brand` es la posición en `brands`. */
  models: { slug: string; name: string; brand: number; bodyType: BodyType }[];
  /** `model` es la posición en `models`. */
  trims: { slug: string; name: string; model: number }[];
  /** Vehículos publicados: [modelo, versión (-1 sin versión de catálogo), carrocería, condición, combustible, transmisión, tracción, año, cantidad]. */
  stock: [number, number, BodyType, Condition, Fuel, Transmission, Drivetrain, number, number][];
};

/** Filtros que el índice sabe contar (mismos nombres que los parámetros de /vehiculos). */
export type Filters = {
  marca?: string;
  modelo?: string;
  version?: string;
  tipo?: BodyType;
  condicion?: Condition;
  combustible?: Fuel;
  transmision?: Transmission;
  traccion?: Drivetrain;
  anioMin?: number;
  anioMax?: number;
};

export type Kind = "brand" | "model" | "trim" | "type" | "condition" | "fuel" | "transmission" | "drivetrain" | "year" | "text";

export const KIND_LABEL: Record<Kind, string> = {
  brand: "Marca",
  model: "Modelo",
  trim: "Versión",
  type: "Tipo",
  condition: "Condición",
  fuel: "Combustible",
  transmission: "Transmisión",
  drivetrain: "Tracción",
  year: "Año",
  text: "Texto",
};

export type Suggestion = {
  kind: Kind;
  /** "Toyota Corolla LE", "Jeepetas" o el texto libre. */
  title: string;
  /** Resto de filtros: "Usados · Diésel · 2020". */
  meta: string[];
  /** Vehículos publicados; `null` si hay filtros que el índice no cuenta (precio, color…). */
  count: number | null;
  /** Marca para el logo. */
  brand?: SearchIndex["brands"][number];
  bodyType?: BodyType;
  href: string;
};

type Term = { kind: Exclude<Kind, "year" | "text">; key: string; words: string[]; set: Filters; weight: number };
type Row = { marca: string; modelo: string; version: string | null; tipo: BodyType; condicion: Condition; combustible: Fuel; transmision: Transmission; traccion: Drivetrain; year: number; n: number };

export type PreparedIndex = {
  terms: Term[];
  exact: Map<string, Term[]>;
  rows: Row[];
  brands: Map<string, SearchIndex["brands"][number]>;
  models: Map<string, { name: string; bodyType: BodyType }>;
  trims: Map<string, string>;
};

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();


// Formas en que la gente escribe cada filtro (normalizadas: sin acentos ni mayúsculas).
const TYPE_ALIASES: Record<BodyType, string[]> = {
  JEEPETA: ["jeepeta", "jeepetas", "yipeta", "yipetas", "suv", "suvs", "todoterreno"],
  SEDAN: ["sedan", "sedanes"],
  PICKUP: ["camioneta", "camionetas", "pickup", "pickups", "pick up"],
  HATCHBACK: ["hatchback", "hatchbacks", "hatch"],
  COUPE: ["coupe", "coupes", "cupe", "deportivo", "deportivos"],
  CONVERTIBLE: ["convertible", "convertibles", "descapotable"],
  MINIVAN: ["minivan", "minivans"],
  VAN: ["van", "vans", "guagua", "guaguas", "furgoneta"],
};
const CONDITION_ALIASES: Record<Condition, string[]> = {
  NEW: ["nuevo", "nueva", "nuevos", "nuevas", "0km"],
  USED: ["usado", "usada", "usados", "usadas"],
};
const FUEL_ALIASES: Record<Fuel, string[]> = {
  GASOLINE: ["gasolina"],
  DIESEL: ["diesel", "gasoil"],
  HYBRID: ["hibrido", "hibrida", "hibridos", "hybrid"],
  ELECTRIC: ["electrico", "electrica", "electricos", "ev"],
  GLP: ["glp", "gas"],
};
const TRANSMISSION_ALIASES: Record<Transmission, string[]> = {
  AUTOMATIC: ["automatico", "automatica", "automaticos"],
  MANUAL: ["manual", "mecanico", "mecanica"],
  CVT: ["cvt"],
};
const DRIVETRAIN_ALIASES: Record<Drivetrain, string[]> = {
  FOUR_WD: ["4x4", "4wd"],
  AWD: ["awd"],
  FWD: ["fwd"],
  RWD: ["rwd"],
};
const BRAND_ALIASES: Record<string, string[]> = {
  volkswagen: ["vw"],
  chevrolet: ["chevy"],
  "mercedes-benz": ["mercedes", "benz"],
};
/** Palabras que no filtran nada ("jeepeta del 2020", "año 2018"). */
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "en", "con", "y", "o", "para", "un", "una", "ano", "anos", "modelo"]);

const TYPE_PLURAL = Object.fromEntries(BODY_TYPES.map((t) => [t.value, t.plural])) as Record<BodyType, string>;
const isYear = (w: string) => /^(19[5-9]\d|20\d\d)$/.test(w);

export function prepareIndex(index: SearchIndex): PreparedIndex {
  const terms: Term[] = [];
  const add = (kind: Term["kind"], text: string, set: Filters, weight: number) => {
    const words = normalize(text).split(" ").filter(Boolean);
    if (words.length) terms.push({ kind, key: words.join(""), words, set, weight });
  };

  const brands = new Map<string, SearchIndex["brands"][number]>();
  const models = new Map<string, { name: string; bodyType: BodyType }>();
  const trims = new Map<string, string>();
  for (const b of index.brands) {
    brands.set(b.slug, b);
    add("brand", b.name, { marca: b.slug }, 3);
    for (const alias of BRAND_ALIASES[b.slug] ?? []) add("brand", alias, { marca: b.slug }, 3);
  }
  for (const m of index.models) {
    const marca = index.brands[m.brand].slug;
    models.set(`${marca}/${m.slug}`, { name: m.name, bodyType: m.bodyType });
    add("model", m.name, { marca, modelo: m.slug }, 2.5);
  }
  for (const t of index.trims) {
    const m = index.models[t.model];
    const marca = index.brands[m.brand].slug;
    trims.set(`${marca}/${m.slug}/${t.slug}`, t.name);
    add("trim", t.name, { marca, modelo: m.slug, version: t.slug }, 1);
  }
  for (const [tipo, aliases] of Object.entries(TYPE_ALIASES)) for (const a of aliases) add("type", a, { tipo: tipo as BodyType }, 2);
  for (const [c, aliases] of Object.entries(CONDITION_ALIASES)) for (const a of aliases) add("condition", a, { condicion: c as Condition }, 1.5);
  for (const [f, aliases] of Object.entries(FUEL_ALIASES)) for (const a of aliases) add("fuel", a, { combustible: f as Fuel }, 1.5);
  for (const [t, aliases] of Object.entries(TRANSMISSION_ALIASES)) for (const a of aliases) add("transmission", a, { transmision: t as Transmission }, 1.5);
  for (const [d, aliases] of Object.entries(DRIVETRAIN_ALIASES)) for (const a of aliases) add("drivetrain", a, { traccion: d as Drivetrain }, 1.5);

  const exact = new Map<string, Term[]>();
  for (const t of terms) exact.set(t.key, [...(exact.get(t.key) ?? []), t]);

  const rows = index.stock.map(([model, trim, tipo, condicion, combustible, transmision, traccion, year, n]) => {
    const m = index.models[model];
    return { marca: index.brands[m.brand].slug, modelo: m.slug, version: trim >= 0 ? index.trims[trim].slug : null, tipo, condicion, combustible, transmision, traccion, year, n };
  });
  return { terms, exact, rows, brands, models, trims };
}

const matches = (r: Row, f: Filters) =>
  (!f.marca || r.marca === f.marca) &&
  (!f.modelo || r.modelo === f.modelo) &&
  (!f.version || r.version === f.version) &&
  (!f.tipo || r.tipo === f.tipo) &&
  (!f.condicion || r.condicion === f.condicion) &&
  (!f.combustible || r.combustible === f.combustible) &&
  (!f.transmision || r.transmision === f.transmision) &&
  (!f.traccion || r.traccion === f.traccion) &&
  (!f.anioMin || r.year >= f.anioMin) &&
  (!f.anioMax || r.year <= f.anioMax);

export const countStock = (ix: PreparedIndex, f: Filters) => ix.rows.reduce((a, r) => (matches(r, f) ? a + r.n : a), 0);

/** El término no contradice lo ya reconocido (otra marca, otro modelo, otro tipo…). */
const compatible = (picked: Filters, set: Filters) =>
  (Object.keys(set) as (keyof Filters)[]).every((k) => picked[k] === undefined || picked[k] === set[k]);

/** Distancia de edición con transposiciones (Damerau restringida), para errores de tipeo. */
function typoDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
const maxTypos = (s: string) => (s.length >= 8 ? 2 : s.length >= 4 ? 1 : 0);
const closeEnough = (s: string, key: string) => {
  const max = maxTypos(s);
  return max > 0 && Math.abs(s.length - key.length) <= max && typoDistance(s, key) <= max;
};
// Para prefijos se exige una letra más: con 4 letras "toyo" ya se parecería a "todo…".
const closePrefix = (s: string, key: string) => {
  const max = s.length >= 5 ? maxTypos(s) : 0;
  if (!max) return false;
  for (let len = s.length - max; len <= s.length + max; len++) if (len > 0 && len <= key.length && typoDistance(s, key.slice(0, len)) <= max) return true;
  return false;
};

/** Las versiones de catálogo solo se reconocen solas dentro de un modelo ("RAV4 limited"); sin modelo, desde 3 letras. */
const trimAllowed = (t: Term, picked: Filters, s: string) => t.kind !== "trim" || picked.modelo !== undefined || s.length >= 3;

/** `tail`: lo que queda al final por completar; `unmatched`: todas las palabras terminadas sin reconocer. */
type Parsed = { picked: Filters; tail: string[]; unmatched: string[] };

/**
 * Lee el texto de izquierda a derecha reconociendo términos completos (también los que ocupan
 * varias palabras: "land rover", "f 150", "mazda 3"). Lo que queda al final sin reconocer, más la
 * palabra que se está escribiendo, es la "cola" a completar.
 */
export function parseQuery(ix: PreparedIndex, query: string): Parsed {
  const words = normalize(query).split(" ").filter(Boolean);
  const typing = words.length > 0 && !/\s$/.test(query);
  const head = typing ? words.slice(0, -1) : words;
  const picked: Filters = {};
  const used = head.map(() => false);
  const years: number[] = [];

  const pick = (from: number, len: number, set: Filters) => {
    Object.assign(picked, set);
    for (let k = from; k < from + len; k++) used[k] = true;
  };
  // Entre varios términos posibles, el que deja más vehículos.
  const best = (terms: Term[]) =>
    terms
      .map((t) => ({ t, n: countStock(ix, { ...picked, ...t.set }) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)[0]?.t;

  const scan = (accept: (t: Term) => boolean, fuzzy: boolean) => {
    for (let i = 0; i < head.length; i++) {
      if (used[i]) continue;
      if (STOPWORDS.has(head[i])) {
        used[i] = true;
        continue;
      }
      if (isYear(head[i])) {
        years.push(Number(head[i]));
        used[i] = true;
        continue;
      }
      for (let len = Math.min(3, head.length - i); len >= 1; len--) {
        if (used.slice(i, i + len).some(Boolean)) continue;
        const key = head.slice(i, i + len).join("");
        const pool = fuzzy ? (len === 1 ? ix.terms.filter((t) => closeEnough(key, t.key)) : []) : (ix.exact.get(key) ?? []);
        const t = best(pool.filter((t) => accept(t) && compatible(picked, t.set)));
        if (t) {
          pick(i, len, t.set);
          break;
        }
      }
    }
  };
  // Primero marcas, modelos y filtros; luego versiones (ya con el modelo) y por último errores de tipeo.
  scan((t) => t.kind !== "trim", false);
  scan((t) => t.kind === "trim" && picked.modelo !== undefined, false);
  scan((t) => t.kind !== "trim" || picked.modelo !== undefined, true);

  if (years.length) {
    picked.anioMin = Math.min(...years);
    picked.anioMax = Math.max(...years);
  }

  let start = head.length;
  while (start > 0 && !used[start - 1]) start--;
  return { picked, tail: [...head.slice(start), ...(typing ? [words.at(-1)!] : [])], unmatched: head.filter((_, i) => !used[i]) };
}

/**
 * Texto libre enviado tal cual (Enter antes de que cargue el índice, sin JS o «Buscar “…”»): se
 * convierte en los mismos filtros que reconoce el autocompletado y solo las palabras sin reconocer
 * siguen como `q`. Devuelve la URL a la que redirigir, o `null` si no reconoce nada.
 */
export function resolveFreeText(ix: PreparedIndex, params: Record<string, string>): string | null {
  if (!params.q) return null;
  const { picked, unmatched } = parseQuery(ix, `${params.q} `);
  if (!Object.keys(picked).length) return null;
  const { filters, rest } = fromParams(params);
  return toHref(applyPicked(filters, picked), rest, unmatched.join(" ") || undefined);
}

/** Parámetros de la URL actual → filtros contables + resto (precio, color…) que se conserva tal cual. */
export function fromParams(params: Record<string, string>) {
  const f: Filters = {};
  const rest: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!v || k === "q" || k === "pagina") continue;
    if (k === "marca" || k === "modelo" || k === "version") f[k] = v;
    else if (k === "condicion") f.condicion = v === "nuevo" ? "NEW" : "USED";
    else if (k === "tipo") f.tipo = v.toUpperCase() as BodyType;
    else if (k === "combustible") f.combustible = v.toUpperCase() as Fuel;
    else if (k === "transmision") f.transmision = v.toUpperCase() as Transmission;
    else if (k === "traccion") f.traccion = v.toUpperCase() as Drivetrain;
    else if (k === "anioMin" || k === "anioMax") f[k] = Number(v);
    else rest[k] = v;
  }
  // `orden`, `vista`, `moneda` e `ia` no cambian los conteos.
  const countable = Object.keys(rest).every((k) => ["orden", "vista", "moneda", "ia"].includes(k));
  return { filters: f, rest, countable };
}

/** Lo escrito manda sobre los filtros vigentes; cambiar de marca o modelo descarta los que dependían de ellos. */
export function applyPicked(base: Filters, picked: Filters): Filters {
  const out = { ...base };
  if (picked.marca && picked.marca !== out.marca) delete out.modelo;
  if (picked.modelo && picked.modelo !== out.modelo) {
    delete out.version;
    // El modelo ya define la carrocería: "civic" mientras se miran jeepetas busca el Civic.
    if (!picked.tipo) delete out.tipo;
  }
  if (!out.modelo) delete out.version;
  return { ...out, ...picked };
}

export function toHref(f: Filters, rest: Record<string, string> = {}, q?: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (f.condicion) p.set("condicion", f.condicion === "NEW" ? "nuevo" : "usado");
  if (f.tipo) p.set("tipo", f.tipo.toLowerCase());
  if (f.marca) p.set("marca", f.marca);
  if (f.marca && f.modelo) p.set("modelo", f.modelo);
  if (f.marca && f.modelo && f.version) p.set("version", f.version);
  if (f.anioMin) p.set("anioMin", String(f.anioMin));
  if (f.anioMax) p.set("anioMax", String(f.anioMax));
  if (f.combustible) p.set("combustible", f.combustible.toLowerCase());
  if (f.transmision) p.set("transmision", f.transmision.toLowerCase());
  if (f.traccion) p.set("traccion", f.traccion.toLowerCase());
  for (const [k, v] of Object.entries(rest)) p.set(k, v);
  const qs = p.toString();
  return qs ? `/vehiculos?${qs}` : "/vehiculos";
}

type Candidate = { set: Filters; score: number; fuzzy?: boolean };

/** Qué es la sugerencia, según lo más específico que fija lo escrito (no los filtros heredados). */
function kindOf(f: Filters): Kind {
  if (f.version) return "trim";
  if (f.modelo) return "model";
  if (f.marca) return "brand";
  if (f.tipo) return "type";
  if (f.condicion) return "condition";
  if (f.combustible) return "fuel";
  if (f.transmision) return "transmission";
  if (f.traccion) return "drivetrain";
  return "year";
}

/** Términos que completan la cola: primero tomando toda la cola ("range rover sp"), luego solo la última palabra. */
function complete(ix: PreparedIndex, picked: Filters, tail: string[]): Candidate[] {
  const out: Candidate[] = [];
  for (let from = 0; from < tail.length; from++) {
    const s = tail.slice(from).join("");
    const span = tail.length - from;
    if (!s || (span === 1 && STOPWORDS.has(s))) continue;
    if (isYear(s)) out.push({ set: { anioMin: Number(s), anioMax: Number(s) }, score: 30 + span });
    for (const t of ix.terms) {
      if (!compatible(picked, t.set) || !trimAllowed(t, picked, s)) continue;
      let quality = 0;
      if (t.key === s) quality = 4;
      else if (t.key.startsWith(s)) quality = 3;
      else if (span === 1 && s.length >= 2 && t.words.slice(1).some((w) => w.startsWith(s))) quality = 2;
      // Una versión por parecido solo dentro de su modelo: sin él, "l200" daría el C 200 de Mercedes.
      else if ((t.kind !== "trim" || picked.modelo) && (closeEnough(s, t.key) || closePrefix(s, t.key))) quality = 1;
      if (quality) out.push({ set: t.set, score: quality * 10 + t.weight + span * 2, fuzzy: quality === 1 });
    }
    // Si la cola completa ya dio resultados, no se prueban colas más cortas.
    if (out.length) break;
  }
  // Los parecidos solo cuando nada coincide de verdad: "toyot" es Toyota, no "todot(erreno)".
  return out.some((c) => !c.fuzzy) ? out.filter((c) => !c.fuzzy) : out;
}

/** Hijos de una búsqueda para seguir afinando: versiones de un modelo, modelos de una marca o de un tipo. */
function refinements(ix: PreparedIndex, picked: Filters, base: Filters, limit: number): Candidate[] {
  const eff = applyPicked(base, picked);
  const level: "version" | "modelo" | null = eff.modelo ? (eff.version ? null : "version") : "modelo";
  if (!level) return [];
  const counts = new Map<string, { set: Filters; n: number }>();
  for (const r of ix.rows) {
    if (!matches(r, eff) || (level === "version" && !r.version)) continue;
    const set: Filters = level === "version" ? { marca: r.marca, modelo: r.modelo, version: r.version! } : { marca: r.marca, modelo: r.modelo };
    const key = `${set.marca}/${set.modelo}/${set.version ?? ""}`;
    const c = counts.get(key) ?? { set, n: 0 };
    c.n += r.n;
    counts.set(key, c);
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((c) => ({ set: { ...picked, ...c.set }, score: 0 }));
}

const plural = (label: string) => (/[aeiou]$/i.test(label) ? `${label}s` : `${label}es`);

function describe(ix: PreparedIndex, f: Filters) {
  const brand = f.marca ? ix.brands.get(f.marca) : undefined;
  const model = f.marca && f.modelo ? ix.models.get(`${f.marca}/${f.modelo}`) : undefined;
  const trim = model && f.version ? ix.trims.get(`${f.marca}/${f.modelo}/${f.version}`) : undefined;
  const named = [brand?.name, model?.name, trim].filter(Boolean).join(" ");
  const meta = [
    named && f.tipo ? TYPE_PLURAL[f.tipo] : null,
    f.condicion ? plural(CONDITION_LABEL[f.condicion]) : null,
    f.combustible ? FUEL_LABEL[f.combustible] : null,
    f.transmision ? TRANSMISSION_LABEL[f.transmision] : null,
    f.traccion ? `Tracción ${DRIVETRAIN_LABEL[f.traccion]}` : null,
    f.anioMin && f.anioMax ? (f.anioMin === f.anioMax ? String(f.anioMin) : `${f.anioMin}–${f.anioMax}`) : f.anioMin ? `Desde ${f.anioMin}` : f.anioMax ? `Hasta ${f.anioMax}` : null,
  ].filter((x): x is string => !!x);
  // Sin marca ni tipo, el primer filtro hace de título: "Híbrido · 2020".
  const title = named || (f.tipo ? TYPE_PLURAL[f.tipo] : (meta.shift() ?? "Vehículos"));
  return { title, meta, brand, bodyType: model?.bodyType ?? f.tipo };
}

/**
 * Sugerencias para el texto escrito. `params` son los filtros vigentes (los de la URL en /vehiculos
 * o los botones del buscador de la portada): se conservan y lo escrito manda sobre ellos.
 */
export function suggest(ix: PreparedIndex, query: string, params: Record<string, string> = {}, limit = 8): Suggestion[] {
  const { filters: base, rest, countable } = fromParams(params);
  const text = query.trim().replace(/\s+/g, " ");
  const { picked, tail } = parseQuery(ix, query);

  let candidates: Candidate[];
  if (!text) candidates = refinements(ix, {}, base, 6);
  else if (tail.length) {
    candidates = complete(ix, picked, tail).map((c) => ({ ...c, set: { ...picked, ...c.set } }));
    if (!candidates.length && Object.keys(picked).length) candidates = [{ set: picked, score: 0 }];
  } else candidates = [{ set: picked, score: 100 }];

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  const push = (list: Candidate[]) => {
    const ranked: { s: Suggestion; score: number; set: Filters }[] = [];
    // Mejor puntaje primero: entre sugerencias que llevan a la misma URL queda la más precisa.
    for (const c of [...list].sort((a, b) => b.score - a.score)) {
      const eff = applyPicked(base, c.set);
      const href = toHref(eff, rest);
      if (seen.has(href)) continue;
      const n = countStock(ix, eff);
      if (!n) continue;
      seen.add(href);
      ranked.push({ s: { kind: kindOf(c.set), ...describe(ix, eff), count: countable ? n : null, href }, score: c.score + Math.log2(n + 1), set: c.set });
    }
    const added = ranked.sort((a, b) => b.score - a.score).slice(0, limit - out.length);
    out.push(...added.map((r) => r.s));
    return added;
  };
  const [lead] = push(candidates);
  // La mejor sugerencia se abre en sus modelos o versiones si queda espacio: "toyo" → Toyota, Corolla, RAV4…
  if (text && lead) push(refinements(ix, lead.set, base, limit - out.length));

  if (text) out.push({ kind: "text", title: text, meta: [], count: null, href: toHref(base, rest, text) });
  return out;
}
