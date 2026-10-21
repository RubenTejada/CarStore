/**
 * Histograma de barras iguales para los filtros de rango (precio, año).
 * La barra `i` cubre [start + i·step, start + (i+1)·step); los valores fuera
 * de rango se acumulan en la primera o la última barra (de ahí el "+");
 * `openStart`/`openEnd` dicen si esas barras incluyen valores de afuera.
 */
export type Histogram = { start: number; step: number; counts: number[]; openStart: boolean; openEnd: boolean };

/** Valores con su frecuencia, tal como salen de un `groupBy`. */
export type Weighted = { value: number; count: number }[];

function bucket(values: Weighted, start: number, step: number, bins: number): Histogram {
  const counts = Array<number>(bins).fill(0);
  const end = start + bins * step;
  let openStart = false;
  let openEnd = false;
  for (const { value, count } of values) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((value - start) / step)));
    counts[i] += count;
    openStart ||= value < start;
    openEnd ||= value >= end;
  }
  return { start, step, counts, openStart, openEnd };
}

/** Valor bajo el cual queda la fracción `p` de los vehículos. */
function percentile(values: Weighted, p: number) {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const target = p * sorted.reduce((n, v) => n + v.count, 0);
  let seen = 0;
  for (const v of sorted) {
    seen += v.count;
    if (seen >= target) return v.value;
  }
  return sorted[sorted.length - 1].value;
}

/** Paso "redondo" (1, 2, 2.5 o 5 × 10ⁿ) más cercano a `raw`. */
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const off = (m: number) => Math.abs(Math.log(m * pow) - Math.log(raw));
  return [1, 2, 2.5, 5, 10].reduce((best, m) => (off(m) < off(best) ? m : best)) * pow;
}

/** Precios: escala lineal hasta el percentil 95; los más caros van a la última barra. */
export function priceHistogram(values: Weighted, targetBins = 30): Histogram | null {
  if (!values.length) return null;
  const min = Math.min(...values.map((v) => v.value));
  const top = percentile(values, 0.95);
  const step = niceStep(Math.max(top - min, 1) / targetBins);
  const start = Math.floor(min / step) * step;
  const bins = Math.max(1, Math.ceil((top - start) / step));
  return bucket(values, start, step, bins);
}

/** Años: una barra por año, hasta `maxBins` años; los más viejos van a la primera barra. */
export function yearHistogram(values: Weighted, maxBins = 30): Histogram | null {
  if (!values.length) return null;
  const years = values.map((v) => v.value);
  const max = Math.max(...years);
  const start = Math.max(Math.min(...years), max - maxBins + 1);
  return bucket(values, start, 1, max - start + 1);
}
