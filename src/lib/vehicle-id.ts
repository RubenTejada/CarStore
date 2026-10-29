// Placa y chasis (VIN) de un anuncio: el comprador los usa para verificar el vehículo en la DGII.

/** Consulta de placas de la DGII (pide la placa y la cédula o RNC del propietario). */
export const DGII_PLATE_LOOKUP_URL = "https://dgii.gov.do/vehiculosMotor/consultas/Paginas/consultaPlacas.aspx";

const PLATE_RE = /^[A-Z]{1,2}\d{5,6}$/;
// 17 caracteres; el VIN nunca usa I, O ni Q.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

const compact = (raw: string) => raw.toUpperCase().replace(/[\s.-]/g, "");

/** «a-123 456» → «A123456»; `null` si está vacía; `undefined` si no tiene forma de placa dominicana. */
export function normalizePlate(raw: string): string | null | undefined {
  const v = compact(raw);
  if (!v) return null;
  return PLATE_RE.test(v) ? v : undefined;
}

/** VIN en mayúsculas sin espacios; `null` si está vacío; `undefined` si no es válido. */
export function normalizeVin(raw: string): string | null | undefined {
  const v = compact(raw);
  if (!v) return null;
  return VIN_RE.test(v) ? v : undefined;
}
