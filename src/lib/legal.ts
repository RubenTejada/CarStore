// Cambiar la versión al modificar los textos o el alcance de las autorizaciones.
// Conservar cada versión publicada en el historial del repositorio.
export const LEGAL_VERSION = "2026-11-01";
export const LEGAL_DATE = "1 de noviembre de 2026";

export const LEGAL_DOCUMENTS = {
  terminos: { title: "Términos de uso", description: "Condiciones de las cuentas, anuncios y uso de TuCarroOnline." },
  privacidad: { title: "Política de privacidad", description: "Datos personales, finalidades, destinatarios y derechos." },
  cookies: { title: "Cookies y almacenamiento", description: "Sesión, preferencias locales, mapas y servicios externos." },
  publicaciones: { title: "Política de publicaciones e importación", description: "Veracidad, derechos de contenido y anuncios permitidos." },
  pagos: { title: "Planes, pagos y reembolsos", description: "Activación, vigencia, cancelación y reclamaciones de planes." },
  avisos: { title: "Avisos sobre vehículos y financiamiento", description: "Alcance de los anuncios, cálculos, distintivos y enlaces externos." },
} as const;

export function legalOperator() {
  return {
    name: process.env.LEGAL_OPERATOR_NAME?.trim() || "",
    rnc: process.env.LEGAL_OPERATOR_RNC?.trim() || "",
    address: process.env.LEGAL_OPERATOR_ADDRESS?.trim() || "",
    email: process.env.LEGAL_CONTACT_EMAIL?.trim() || "",
    // El número completo permanece en configuración privada; nunca se envía al cliente.
    documentLast4: process.env.LEGAL_OPERATOR_DOCUMENT?.trim().replace(/\D/g, "").slice(-4) || "",
  };
}

export function legalOperatorReady() {
  const o = legalOperator();
  return !!(o.name && o.rnc && o.address && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email));
}
