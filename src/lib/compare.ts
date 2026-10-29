// Comparador de vehículos: utilidades puras compartidas por la página /comparar y el estado del navegador.

export const MAX_COMPARE = 3;

/** Lo mínimo para pintar un vehículo en la bandeja sin consultar al servidor. */
export type CompareItem = { id: string; title: string; year: number; photo?: string };

export const ID_RE = /^[\w-]{1,40}$/;

/** `?ids=a,b,c` → ids válidos, sin repetir y como máximo MAX_COMPARE. */
export function parseCompareIds(value: string | string[] | undefined): string[] {
  const raw = (Array.isArray(value) ? value.join(",") : (value ?? "")).split(",");
  return [...new Set(raw.map((s) => s.trim()).filter((s) => ID_RE.test(s)))].slice(0, MAX_COMPARE);
}

export function compareUrl(ids: string[], onlyDiff = false) {
  const qs = new URLSearchParams({ ids: ids.join(",") });
  if (onlyDiff) qs.set("dif", "1");
  return `/comparar?${qs.toString().replace(/%2C/g, ",")}`;
}

/** Índices con el mejor valor; vacío si todos empatan (no hay nada que destacar). */
export function bestIndices(values: (number | null)[], prefer: "min" | "max"): number[] {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2 || nums.every((n) => n === nums[0])) return [];
  const best = prefer === "min" ? Math.min(...nums) : Math.max(...nums);
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

export function parseCompareItems(raw: string | null): CompareItem[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (d): d is CompareItem =>
          !!d && typeof d.id === "string" && ID_RE.test(d.id) && typeof d.title === "string" && typeof d.year === "number" && (d.photo === undefined || typeof d.photo === "string"),
      )
      .slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}
