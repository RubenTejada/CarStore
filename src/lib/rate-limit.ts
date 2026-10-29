// Límite de uso en memoria (ventana fija por clave) para las llamadas a Claude que dispara un visitante.
// Es por proceso: frena el abuso de una instancia, no reemplaza un límite global.

const windows = new Map<string, { start: number; count: number }>();

/** `true` si `key` aún puede hacer una llamada en la ventana actual (y la cuenta). */
export function takeToken(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}
