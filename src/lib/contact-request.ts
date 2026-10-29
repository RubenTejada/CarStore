// Solicitudes «Me interesa» / prueba de manejo (ver actions/contact.ts).
import { rdDay } from "@/lib/usd-rate";

/** Días hacia adelante que se puede pedir una prueba de manejo. */
export const MAX_TEST_DRIVE_DAYS = 60;

/** Fechas válidas para la prueba de manejo (días en Santo Domingo, "AAAA-MM-DD"). */
export function testDriveWindow(now = new Date()) {
  return { min: rdDay(now), max: rdDay(new Date(now.getTime() + MAX_TEST_DRIVE_DAYS * 86_400_000)) };
}
