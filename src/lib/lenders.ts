import type { Condition } from "@/generated/prisma/enums";

/**
 * Entidades que financian vehículos en República Dominicana.
 *
 * Aquí está lo que cambia poco y se verifica a mano (datos de contacto, inicial y plazo según la
 * página oficial del producto). Las tasas cambian a menudo: las lee cada día el trabajo
 * `scripts/update-rates.ts` desde `rates` y se guardan en la tabla `LoanRate`.
 * Una entidad sin `rates` no publica sus tasas en un documento legible sin navegador
 * (o lo bloquea), así que se muestra con «Consultar tasa».
 */

export type LenderKind = "BANCO_MULTIPLE" | "ASOCIACION" | "BANCO_AHORRO_CREDITO";

export const LENDER_KIND_LABEL: Record<LenderKind, string> = {
  BANCO_MULTIPLE: "Banco múltiple",
  ASOCIACION: "Asociación de ahorros y préstamos",
  BANCO_AHORRO_CREDITO: "Banco de ahorro y crédito",
};

/**
 * Dónde publica la entidad sus tasas. `link`: el documento cambia de nombre con cada versión y se
 * busca en la página `url`; el patrón debe abarcar la URL completa (o capturarla en el grupo 1).
 */
export type RateSource = { url: string; link?: RegExp };

/** Condiciones publicadas en la página oficial del producto (`loanUrl`). */
export type LoanTerms = { maxFinancingPct?: number; maxTermMonths?: number };

export type Lender = {
  slug: string;
  name: string;
  kind: LenderKind;
  website: string;
  /** Isotipo de la entidad en `public/lenders`, tomado de su sitio oficial. */
  logo: string;
  /** Página del préstamo de vehículos. */
  loanUrl: string;
  phone?: string;
  rates?: RateSource;
  terms?: Partial<Record<Condition, LoanTerms>>;
};

// Revisado el 20 de octubre de 2026. `terms` solo con lo que dice la página oficial del producto.
export const LENDERS: Lender[] = [
  {
    slug: "banreservas",
    logo: "/lenders/banreservas.png",
    name: "Banreservas",
    kind: "BANCO_MULTIPLE",
    website: "https://www.banreservas.com",
    loanUrl: "https://www.banreservas.com/personal/prestamos/prestamos-vehiculos-nuevos/",
    phone: "809-960-2121",
    // PDF en imagen: Claude lo lee visualmente.
    rates: { url: "https://www.banreservas.com/", link: /["'](https:\/\/[^"']*\/tasas-de-referencia[^"']*\.pdf)/i },
    terms: { NEW: { maxFinancingPct: 80 }, USED: { maxFinancingPct: 70, maxTermMonths: 48 } },
  },
  {
    slug: "apap",
    logo: "/lenders/apap.png",
    name: "APAP",
    kind: "ASOCIACION",
    website: "https://www.apap.com.do",
    loanUrl: "https://www.apap.com.do/productos/prestamos-de-vehiculos/",
    phone: "809-687-2727",
    rates: { url: "https://www.apap.com.do/acerca-apap/tasas-de-interes/", link: /["']([^"']*Tarifario-Escala-de-Tasas-Activas-y-Pasivas[^"']*\.pdf)/i },
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 72 }, USED: { maxFinancingPct: 75, maxTermMonths: 60 } },
  },
  {
    slug: "scotiabank",
    logo: "/lenders/scotiabank.svg",
    name: "Scotiabank",
    kind: "BANCO_MULTIPLE",
    website: "https://do.scotiabank.com",
    loanUrl: "https://do.scotiabank.com/banca-personal/prestamos/prestamos-de-vehiculos.html",
    phone: "809-567-7268",
    rates: { url: "https://do.scotiabank.com/banca-personal/tarifas/tasas-prestamos.html" },
    terms: { NEW: { maxFinancingPct: 100, maxTermMonths: 84 }, USED: { maxFinancingPct: 100, maxTermMonths: 84 } },
  },
  {
    slug: "santa-cruz",
    logo: "/lenders/santa-cruz.svg",
    name: "Banco Santa Cruz",
    kind: "BANCO_MULTIPLE",
    website: "https://bsc.com.do",
    loanUrl: "https://bsc.com.do",
    phone: "809-726-1000",
    // El PDF lleva un token firmado en la URL: se toma siempre de la página.
    rates: {
      url: "https://bsc.com.do/sobre-nosotros/tarifarios-y-tasas/tarifario-de-productos-y-servicios-y-tasas",
      link: /name:"Tasas de referencia y pago de intereses[^"]*",description:"[^"]*",file:"(https:\/\/stgpwebsc\.blob\.core\.windows\.net\/[^"]+)"/,
    },
  },
  {
    slug: "promerica",
    logo: "/lenders/promerica.png",
    name: "Banco Promerica",
    kind: "BANCO_MULTIPLE",
    website: "https://www.promerica.com.do",
    loanUrl: "https://www.promerica.com.do/banca-personal/prestamos/prestamos-de-vehiculos/",
    phone: "809-732-6006",
    rates: {
      url: "https://www.promerica.com.do/quienes-somos/publicaciones-institucionales/tarifarios-de-productos-y-servicios-promerica/",
      link: /["']([^"']*\/media\/[a-z0-9]+\/tasas-referencia[^"']*\.pdf)/i,
    },
    terms: { NEW: { maxFinancingPct: 90, maxTermMonths: 84 }, USED: { maxFinancingPct: 90, maxTermMonths: 84 } },
  },
  {
    slug: "banesco",
    logo: "/lenders/banesco.svg",
    name: "Banesco",
    kind: "BANCO_MULTIPLE",
    website: "https://www.banesco.com.do",
    loanUrl: "https://www.banesco.com.do/prestamos/vehiculos/",
    phone: "829-893-8200",
    // Redirige al tarifario vigente; las tasas están en su «Anexo I».
    rates: { url: "https://contigo.banesco.do/tarifario" },
    terms: { NEW: { maxFinancingPct: 90, maxTermMonths: 72 }, USED: { maxFinancingPct: 85, maxTermMonths: 72 } },
  },
  {
    slug: "bdi",
    logo: "/lenders/bdi.png",
    name: "Banco BDI",
    kind: "BANCO_MULTIPLE",
    website: "https://www.bdi.com.do",
    loanUrl: "https://www.bdi.com.do/prestamos/prestamos-de-vehiculos/",
    phone: "809-535-8586",
    rates: { url: "https://www.bdi.com.do/informaciones/tasas-de-referencia/", link: /["']([^"']*\/media\/[a-z0-9]+\/tasas-de-referencia[^"']*\.pdf)/i },
    terms: { NEW: { maxTermMonths: 84 }, USED: { maxTermMonths: 84 } },
  },
  {
    slug: "lopez-de-haro",
    logo: "/lenders/lopez-de-haro.png",
    name: "Banco López de Haro",
    kind: "BANCO_MULTIPLE",
    website: "https://www.blh.com.do",
    loanUrl: "https://www.blh.com.do/prestamos-personas/",
    phone: "809-535-8994",
    rates: { url: "https://www.blh.com.do/", link: /["']([^"']*docs\/tasas-activas-pasivas[^"']*\.pdf)/i },
  },
  {
    slug: "jmmb",
    logo: "/lenders/jmmb.png",
    name: "JMMB Bank",
    kind: "BANCO_MULTIPLE",
    website: "https://do.jmmb.com/bank",
    loanUrl: "https://do.jmmb.com/bank/prestamo-de-vehiculo-nuevo",
    phone: "809-683-1333",
    rates: { url: "https://do.jmmb.com/bank/tasas-de-referencia" },
    terms: { NEW: { maxFinancingPct: 90 }, USED: { maxFinancingPct: 70 } },
  },
  {
    slug: "ademi",
    logo: "/lenders/ademi.png",
    name: "Banco Ademi",
    kind: "BANCO_MULTIPLE",
    website: "https://bancoademi.com.do",
    loanUrl: "https://bancoademi.com.do/productos/prestamo-de-vehiculo/",
    phone: "809-683-0203",
    rates: { url: "https://bancoademi.com.do/", link: /["']([^"']*wp-content\/uploads\/\d{4}\/\d{2}\/Tasas-de-Referencias?-Activas-y-Pasivas[^"']*\.pdf)/i },
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 84 }, USED: { maxFinancingPct: 80, maxTermMonths: 84 } },
  },
  {
    slug: "motor-credito",
    logo: "/lenders/motor-credito.png",
    name: "Motor Crédito",
    kind: "BANCO_AHORRO_CREDITO",
    website: "https://motorcredito.com.do",
    loanUrl: "https://motorcredito.com.do/prestamos/financiamiento/financiamiento-vehiculos/",
    phone: "809-540-3900",
    rates: { url: "https://motorcredito.com.do/tasas-activas-y-pasivas/" },
    terms: { NEW: { maxTermMonths: 84 }, USED: { maxTermMonths: 60 } },
  },
  {
    slug: "union",
    logo: "/lenders/union.png",
    name: "Banco Unión",
    kind: "BANCO_AHORRO_CREDITO",
    website: "https://www.bancounion.com.do",
    loanUrl: "https://www.bancounion.com.do/banca-personal/prestamos-para-vehiculos/",
    phone: "809-565-6191",
    rates: { url: "https://www.bancounion.com.do/tarifario-de-servicios-2/", link: /["']([^"']*wp-content\/uploads\/Tarifario-BU-[^"']*\.pdf)/i },
  },
  {
    slug: "cibao",
    logo: "/lenders/cibao.png",
    name: "Asociación Cibao",
    kind: "ASOCIACION",
    website: "https://www.cibao.com.do",
    loanUrl: "https://www.cibao.com.do/banca-personal/prestamos/prestamos-de-vehiculos/",
    phone: "809-581-4433",
    rates: {
      url: "https://www.cibao.com.do/banca-personal/proteccion-al-usuario/tarifarios-de-servicios/",
      link: /["']([^"']*\/media\/[a-z0-9]+\/tarifario-tasas-de-referencia[^"']*\.pdf)/i,
    },
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 72 }, USED: { maxFinancingPct: 80, maxTermMonths: 72 } },
  },
  {
    slug: "la-nacional",
    logo: "/lenders/la-nacional.png",
    name: "Asociación La Nacional",
    kind: "ASOCIACION",
    website: "https://asociacionlanacional.com.do",
    loanUrl: "https://asociacionlanacional.com.do/prestamos-vehiculos-nuevos/",
    phone: "809-731-3333",
    rates: { url: "https://asociacionlanacional.com.do/tarifas-de-servicios/", link: /["']([^"']*docs\/tarifas\/tasas-anualizado-productos[^"']*\.pdf)/i },
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 72 }, USED: { maxFinancingPct: 80, maxTermMonths: 72 } },
  },
  {
    slug: "alaver",
    logo: "/lenders/alaver.png",
    name: "Alaver",
    kind: "ASOCIACION",
    website: "https://alaver.com.do",
    loanUrl: "https://alaver.com.do/prestamo-para-vehiculos/",
    phone: "809-573-2655",
    rates: { url: "https://alaver.com.do/tasas-de-referencia/" },
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 84 }, USED: { maxFinancingPct: 80, maxTermMonths: 84 } },
  },
  // Sin fuente legible: el sitio bloquea clientes que no son navegadores (Popular, Caribe), solo
  // muestra una promoción vencida (BHD), entrega el documento por una API de terceros (Vimenca),
  // publica una tasa activa general (Confisa) o dice que la tasa «varía».
  { slug: "popular", logo: "/lenders/popular.png", name: "Banco Popular", kind: "BANCO_MULTIPLE", website: "https://popularenlinea.com", loanUrl: "https://popularenlinea.com/prestamos", phone: "809-544-5555" },
  { slug: "bhd", logo: "/lenders/bhd.png", name: "Banco BHD", kind: "BANCO_MULTIPLE", website: "https://bhd.com.do", loanUrl: "https://bhd.com.do/homepage-personal/prestamos/fleximovil", phone: "809-243-5000" },
  { slug: "caribe", logo: "/lenders/caribe.png", name: "Banco Caribe", kind: "BANCO_MULTIPLE", website: "https://www.bancocaribe.com.do", loanUrl: "https://www.bancocaribe.com.do", phone: "809-378-0505" },
  { slug: "vimenca", logo: "/lenders/vimenca.svg", name: "Banco Vimenca", kind: "BANCO_MULTIPLE", website: "https://www.bancovimenca.com", loanUrl: "https://www.bancovimenca.com", phone: "809-533-1400" },
  {
    slug: "lafise",
    logo: "/lenders/lafise.svg",
    name: "Banco Lafise",
    kind: "BANCO_MULTIPLE",
    website: "https://www.lafise.com/blrd",
    loanUrl: "https://www.lafise.com/blrd/banca-personal/prestamos/prestamo-vehiculo/",
    phone: "809-541-4100",
    terms: { NEW: { maxFinancingPct: 90, maxTermMonths: 72 }, USED: { maxFinancingPct: 90, maxTermMonths: 72 } },
  },
  {
    slug: "confisa",
    logo: "/lenders/confisa.png",
    name: "Banco Confisa",
    kind: "BANCO_AHORRO_CREDITO",
    website: "https://www.confisa.do",
    loanUrl: "https://www.confisa.do/producto/prestamos-vehiculos-0-km/",
    phone: "809-227-1066",
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 72 }, USED: { maxFinancingPct: 80, maxTermMonths: 60 } },
  },
  {
    slug: "atlantico",
    logo: "/lenders/atlantico.png",
    name: "Banco Atlántico",
    kind: "BANCO_AHORRO_CREDITO",
    website: "https://ba.com.do",
    loanUrl: "https://ba.com.do/producto/prestamos-para-vehiculos",
    phone: "809-566-5841",
    terms: { NEW: { maxFinancingPct: 90, maxTermMonths: 72 }, USED: { maxFinancingPct: 85, maxTermMonths: 72 } },
  },
  {
    slug: "bonanza",
    logo: "/lenders/bonanza.png",
    name: "Bonanza Banco",
    kind: "BANCO_AHORRO_CREDITO",
    website: "https://bonanzabanco.com.do",
    loanUrl: "https://bonanzabanco.com.do/prestamos-de-vehiculos-personales/",
    phone: "809-537-6034",
    terms: { NEW: { maxFinancingPct: 80, maxTermMonths: 72 }, USED: { maxFinancingPct: 80, maxTermMonths: 72 } },
  },
];
