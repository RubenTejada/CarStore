// Plantillas del anuncio para redes. Cada una pinta el anuncio completo con estilos en línea que entiende
// tanto el navegador (vista previa del editor) como Satori (la imagen final, ver render.tsx): solo flexbox,
// posiciones absolutas y `display: flex` en todo elemento con más de un hijo.
/* eslint-disable @next/next/no-img-element -- Satori solo entiende <img> */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { FONTS, adPhotos, alpha, fillText, type AdData, type AdDesign, type TemplateId } from "./design";

export type Box = { w: number; h: number };

/** Quien pinta (navegador o servidor) resuelve las fotos y el logo. */
export type Painter = {
  /** Foto `src` llenando una caja de `box`; `main` aplica el zoom y el encuadre del diseño. */
  photo: (src: string, box: Box, main: boolean) => ReactElement;
  /** Logo del dealer ya resuelto (URL o data URI), o `null`. */
  logo: string | null;
};

type Ctx = {
  d: AdDesign;
  data: AdData;
  W: number;
  H: number;
  t: (px: number) => number;
  heading: CSSProperties;
  body: CSSProperties;
  bold: CSSProperties;
  photos: string[];
  paint: Painter;
};

type Template = {
  label: string;
  description: string;
  /** Cajas de las fotos, en orden, para el formato dado. */
  slots: (W: number, H: number) => Box[];
  render: (c: Ctx) => ReactElement;
};

const flex = (style: CSSProperties = {}): CSSProperties => ({ display: "flex", ...style });
const col = (style: CSSProperties = {}): CSSProperties => ({ display: "flex", flexDirection: "column", ...style });
const abs = (style: CSSProperties): CSSProperties => ({ display: "flex", position: "absolute", ...style });
/** Capa que cubre todo el anuncio (Satori no entiende `inset`). */
const cover = (c: Ctx): CSSProperties => abs({ top: 0, left: 0, width: c.W, height: c.H });

function Photo(c: Ctx, i: number, box: Box, style: CSSProperties = {}) {
  const src = c.photos[i];
  return (
    <div style={flex({ width: box.w, height: box.h, overflow: "hidden", backgroundColor: alpha(c.d.colors.text, 0.12), ...style })}>
      {src ? c.paint.photo(src, box, i === 0) : null}
    </div>
  );
}

function Logo(c: Ctx, size: number, style: CSSProperties = {}) {
  if (!c.d.show.logo) return null;
  if (c.paint.logo)
    return (
      <div style={flex({ width: size, height: size, borderRadius: size * 0.18, backgroundColor: "#ffffff", padding: size * 0.08, ...style })}>
        <img src={c.paint.logo} width={size * 0.84} height={size * 0.84} style={{ width: size * 0.84, height: size * 0.84, objectFit: "contain" }} alt="" />
      </div>
    );
  return (
    <div style={flex({ ...c.bold, fontSize: c.t(30), color: c.d.colors.text, padding: `${c.t(10)}px ${c.t(18)}px`, borderRadius: 999, backgroundColor: alpha(c.d.colors.bg, 0.75), ...style })}>
      {c.data.dealerName}
    </div>
  );
}

function Badge(c: Ctx, style: CSSProperties = {}) {
  const text = fillText(c.d.badge, c.data);
  if (!c.d.show.badge || !text) return null;
  return (
    <div style={flex({ ...c.bold, fontSize: c.t(30), textTransform: "uppercase", letterSpacing: 2, color: c.d.colors.accentText, backgroundColor: c.d.colors.accent, padding: `${c.t(12)}px ${c.t(24)}px`, borderRadius: 999, ...style })}>
      {text}
    </div>
  );
}

function Headline(c: Ctx, size: number, color: string, style: CSSProperties = {}) {
  const headline = fillText(c.d.headline, c.data);
  const sub = fillText(c.d.subheadline, c.data);
  const center = c.d.align === "center";
  return (
    <div style={col({ alignItems: center ? "center" : "flex-start", ...style })}>
      <div style={flex({ ...c.heading, fontSize: c.t(size), lineHeight: 1.02, color, textAlign: center ? "center" : "left" })}>{headline}</div>
      {sub ? <div style={flex({ ...c.body, fontSize: c.t(size * 0.42), color: alpha(color, 0.85), marginTop: c.t(10), textAlign: center ? "center" : "left" })}>{sub}</div> : null}
    </div>
  );
}

function Specs(c: Ctx, color: string, chip: string, style: CSSProperties = {}) {
  if (!c.d.show.specs) return null;
  const items = [String(c.data.year), c.data.mileage, c.data.transmission, c.data.fuel];
  return (
    <div style={flex({ flexWrap: "wrap", justifyContent: c.d.align === "center" ? "center" : "flex-start", ...style })}>
      {items.map((item) => (
        <div key={item} style={flex({ ...c.body, fontSize: c.t(28), color, backgroundColor: chip, borderRadius: 999, padding: `${c.t(8)}px ${c.t(20)}px`, marginRight: c.t(12), marginTop: c.t(12) })}>
          {item}
        </div>
      ))}
    </div>
  );
}

function Price(c: Ctx, size: number, color: string, style: CSSProperties = {}) {
  if (!c.d.show.price) return null;
  const before = c.d.show.priceBefore && c.data.priceBefore;
  return (
    <div style={col({ alignItems: c.d.align === "center" ? "center" : "flex-start", ...style })}>
      {before ? <div style={flex({ ...c.body, fontSize: c.t(size * 0.42), color: alpha(color, 0.75), textDecoration: "line-through" })}>{c.data.priceBefore}</div> : null}
      <div style={flex({ ...c.heading, textTransform: "none", fontSize: c.t(size), lineHeight: 1, color })}>{c.data.price}</div>
    </div>
  );
}

function Footer(c: Ctx, color: string, style: CSSProperties = {}) {
  const cta = fillText(c.d.cta, c.data);
  const extras = [c.d.show.contact && c.data.phone, c.d.show.financing && "Financiamiento disponible"].filter(Boolean) as string[];
  if (!(c.d.show.cta && cta) && !extras.length) return null;
  return (
    <div style={col({ alignItems: c.d.align === "center" ? "center" : "flex-start", ...style })}>
      {c.d.show.cta && cta ? (
        <div style={flex({ ...c.bold, fontSize: c.t(32), color: c.d.colors.accentText, backgroundColor: c.d.colors.accent, padding: `${c.t(16)}px ${c.t(30)}px`, borderRadius: c.t(14) })}>{cta}</div>
      ) : null}
      {extras.length ? <div style={flex({ ...c.body, fontSize: c.t(28), color, marginTop: c.t(14) })}>{extras.join("  ·  ")}</div> : null}
    </div>
  );
}

function Frame({ c, children, bg }: { c: Ctx; children: ReactNode; bg?: string }) {
  // Tipografía base explícita: el navegador heredaría la de la página y Satori usa la suya.
  return <div style={flex({ position: "relative", width: c.W, height: c.H, overflow: "hidden", backgroundColor: bg ?? c.d.colors.bg, ...c.body, fontSize: 28, lineHeight: 1.2, color: c.d.colors.text, textAlign: "left" })}>{children}</div>;
}

const veil = (c: Ctx, from: "top" | "bottom" = "bottom") =>
  `linear-gradient(to ${from}, ${alpha(c.d.colors.bg, 0)} 0%, ${alpha(c.d.colors.bg, (c.d.overlay / 100) * 0.55)} 45%, ${alpha(c.d.colors.bg, c.d.overlay / 100)} 100%)`;

export const TEMPLATES: Record<TemplateId, Template> = {
  clasico: {
    label: "Clásico",
    description: "Foto completa con los datos sobre un degradado.",
    slots: (W, H) => [{ w: W, h: H }],
    render: (c) => {
      const { text } = c.d.colors;
      return (
        <Frame c={c}>
          <div style={cover(c)}>{Photo(c, 0, { w: c.W, h: c.H })}</div>
          <div style={abs({ left: 0, right: 0, bottom: 0, height: c.H * 0.68, backgroundImage: veil(c) })} />
          <div style={abs({ top: 48, left: 48, right: 48, justifyContent: "space-between", alignItems: "flex-start" })}>
            {Logo(c, 120) ?? <div />}
            {Badge(c) ?? <div />}
          </div>
          <div style={abs({ left: 56, right: 56, bottom: 56, flexDirection: "column", alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
            {Headline(c, 84, text)}
            {Specs(c, text, alpha(text, 0.16), { marginTop: c.t(8) })}
            <div style={flex({ width: "100%", marginTop: c.t(28), alignItems: "flex-end", justifyContent: c.d.align === "center" ? "center" : "space-between", flexWrap: "wrap" })}>
              {Price(c, 96, c.d.colors.accent, { marginRight: 24 })}
              {Footer(c, text, { marginTop: c.t(16) })}
            </div>
          </div>
        </Frame>
      );
    },
  },

  banda: {
    label: "Banda de color",
    description: "Foto arriba y una franja sólida con la información.",
    slots: (W, H) => [{ w: W, h: Math.round(H * 0.64) }],
    render: (c) => {
      const ph = Math.round(c.H * 0.64);
      const { text, accent } = c.d.colors;
      return (
        <Frame c={c}>
          <div style={col({ width: c.W, height: c.H })}>
            {Photo(c, 0, { w: c.W, h: ph })}
            <div style={flex({ width: c.W, height: 14, backgroundColor: accent })} />
            <div style={col({ flex: 1, padding: "36px 56px", justifyContent: "center", alignItems: c.d.align === "center" ? "center" : "stretch" })}>
              <div style={flex({ justifyContent: c.d.align === "center" ? "center" : "space-between", alignItems: "center" })}>
                {Headline(c, 70, text)}
                {c.d.align === "center" ? null : Logo(c, 104)}
              </div>
              <div style={flex({ marginTop: c.t(16), alignItems: "center", justifyContent: c.d.align === "center" ? "center" : "space-between", flexWrap: "wrap" })}>
                {Price(c, 80, accent, { marginRight: 24 })}
                {Footer(c, text)}
              </div>
              {Specs(c, text, alpha(text, 0.1))}
            </div>
          </div>
          <div style={abs({ top: 40, left: 40 })}>{Badge(c)}</div>
        </Frame>
      );
    },
  },

  etiqueta: {
    label: "Precio protagonista",
    description: "Una etiqueta grande con el precio sobre la foto.",
    slots: (W, H) => [{ w: W, h: H }],
    render: (c) => {
      const { text, accent, accentText } = c.d.colors;
      const tag = c.t(330);
      return (
        <Frame c={c}>
          <div style={cover(c)}>{Photo(c, 0, { w: c.W, h: c.H })}</div>
          <div style={abs({ left: 0, right: 0, bottom: 0, height: c.H * 0.5, backgroundImage: veil(c) })} />
          {c.d.show.price ? (
            <div style={abs({ top: 48, right: 48, width: tag, height: tag, borderRadius: tag, backgroundColor: accent, flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" })}>
              <div style={flex({ ...c.bold, fontSize: c.t(30), color: accentText, textTransform: "uppercase", letterSpacing: 3 })}>{c.d.show.badge && c.d.badge ? fillText(c.d.badge, c.data) : "Precio"}</div>
              {c.d.show.priceBefore && c.data.priceBefore ? <div style={flex({ ...c.body, fontSize: c.t(26), color: alpha(accentText, 0.8), textDecoration: "line-through", marginTop: 6 })}>{c.data.priceBefore}</div> : null}
              <div style={flex({ ...c.heading, textTransform: "none", fontSize: c.t(56), color: accentText, marginTop: 6, textAlign: "center" })}>{c.data.price}</div>
            </div>
          ) : (
            <div style={abs({ top: 48, right: 48 })}>{Badge(c)}</div>
          )}
          <div style={abs({ top: 48, left: 48 })}>{Logo(c, 120)}</div>
          <div style={abs({ left: 56, right: 56, bottom: 56, flexDirection: "column", alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
            {Headline(c, 88, text)}
            {Specs(c, text, alpha(text, 0.16), { marginTop: c.t(6) })}
            {Footer(c, text, { marginTop: c.t(24) })}
          </div>
        </Frame>
      );
    },
  },

  dividido: {
    label: "Dividido",
    description: "Panel de color con el texto junto a la foto.",
    slots: (W, H) => (H > W * 1.4 ? [{ w: W, h: Math.round(H * 0.55) }] : [{ w: Math.round(W * 0.58), h: H }]),
    render: (c) => {
      const tall = c.H > c.W * 1.4;
      const box = tall ? { w: c.W, h: Math.round(c.H * 0.55) } : { w: Math.round(c.W * 0.58), h: c.H };
      const { text, accent } = c.d.colors;
      const panel = (
        <div style={col({ flex: 1, padding: tall ? "48px 64px" : "56px 44px", justifyContent: "space-between", alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
          <div style={flex({ justifyContent: "space-between", alignItems: "center", width: "100%" })}>
            {Logo(c, 100) ?? <div />}
            {tall ? Badge(c) : null}
          </div>
          <div style={col({ alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
            {tall ? null : Badge(c, { marginBottom: c.t(24) })}
            {Headline(c, tall ? 84 : 62, text)}
            <div style={flex({ width: c.t(90), height: 8, backgroundColor: accent, marginTop: c.t(24), marginBottom: c.t(20) })} />
            {Price(c, tall ? 92 : 66, accent)}
            {Specs(c, text, alpha(text, 0.12), { marginTop: c.t(8) })}
          </div>
          {Footer(c, text) ?? <div />}
        </div>
      );
      return <Frame c={c}>{tall ? <div style={col({ width: c.W, height: c.H })}>{Photo(c, 0, box)}{panel}</div> : <div style={flex({ width: c.W, height: c.H })}>{panel}{Photo(c, 0, box)}</div>}</Frame>;
    },
  },

  revista: {
    label: "Revista",
    description: "Foto enmarcada con tipografía editorial.",
    slots: (W, H) => [{ w: W - 96, h: Math.round(H * (H > W * 1.4 ? 0.52 : 0.56)) }],
    render: (c) => {
      const box = TEMPLATES.revista.slots(c.W, c.H)[0];
      const { text, accent } = c.d.colors;
      return (
        <Frame c={c}>
          <div style={col({ width: c.W, height: c.H, padding: 48 })}>
            <div style={flex({ justifyContent: "space-between", alignItems: "center", marginBottom: 28 })}>
              <div style={flex({ ...c.bold, fontSize: c.t(26), letterSpacing: 6, textTransform: "uppercase", color: alpha(text, 0.7) })}>{c.data.dealerName}</div>
              {Badge(c)}
            </div>
            {Photo(c, 0, box, { borderRadius: 18 })}
            <div style={col({ flex: 1, justifyContent: "center", alignItems: c.d.align === "center" ? "center" : "flex-start", paddingTop: 28 })}>
              {Headline(c, 82, text)}
              <div style={flex({ width: "100%", alignItems: "center", justifyContent: c.d.align === "center" ? "center" : "space-between", marginTop: c.t(20), flexWrap: "wrap" })}>
                {Price(c, 74, accent, { marginRight: 24 })}
                {Logo(c, 96)}
              </div>
              {Specs(c, text, alpha(text, 0.1))}
              {Footer(c, text, { marginTop: c.t(20) })}
            </div>
          </div>
        </Frame>
      );
    },
  },

  collage: {
    label: "Collage",
    description: "Tres fotos para mostrar más del vehículo.",
    slots: (W, H) => {
      const top = Math.round(H * (H > W * 1.4 ? 0.62 : 0.66));
      if (H > W * 1.4) {
        const main = Math.round(top * 0.62);
        return [{ w: W, h: main }, { w: Math.round(W / 2) - 4, h: top - main - 8 }, { w: Math.round(W / 2) - 4, h: top - main - 8 }];
      }
      const mainW = Math.round(W * 0.64);
      return [{ w: mainW, h: top }, { w: W - mainW - 8, h: Math.round(top / 2) - 4 }, { w: W - mainW - 8, h: Math.round(top / 2) - 4 }];
    },
    render: (c) => {
      const [a, b, d] = TEMPLATES.collage.slots(c.W, c.H);
      const tall = c.H > c.W * 1.4;
      const { text, accent } = c.d.colors;
      const top = tall ? a.h + b.h + 8 : a.h;
      return (
        <Frame c={c}>
          <div style={col({ width: c.W, height: c.H })}>
            {tall ? (
              <div style={col({ width: c.W, height: top })}>
                {Photo(c, 0, a)}
                <div style={flex({ marginTop: 8, justifyContent: "space-between" })}>
                  {Photo(c, 1, b)}
                  {Photo(c, 2, d)}
                </div>
              </div>
            ) : (
              <div style={flex({ width: c.W, height: top, justifyContent: "space-between" })}>
                {Photo(c, 0, a)}
                <div style={col({ justifyContent: "space-between" })}>
                  {Photo(c, 1, b)}
                  {Photo(c, 2, d)}
                </div>
              </div>
            )}
            <div style={col({ flex: 1, padding: "28px 52px", justifyContent: "center", alignItems: c.d.align === "center" ? "center" : "stretch", borderTop: `10px solid ${accent}` })}>
              <div style={flex({ justifyContent: c.d.align === "center" ? "center" : "space-between", alignItems: "center" })}>
                {Headline(c, 64, text)}
                {c.d.align === "center" ? null : Price(c, 70, accent)}
              </div>
              {c.d.align === "center" ? Price(c, 70, accent, { marginTop: c.t(12) }) : null}
              <div style={flex({ alignItems: "center", justifyContent: c.d.align === "center" ? "center" : "space-between", marginTop: c.t(8), flexWrap: "wrap" })}>
                {Specs(c, text, alpha(text, 0.1))}
                {Footer(c, text, { marginTop: c.t(12) })}
              </div>
            </div>
          </div>
          <div style={abs({ top: 32, left: 32 })}>{Logo(c, 104)}</div>
          <div style={abs({ top: 32, right: tall ? 32 : c.W - a.w + 32 })}>{Badge(c)}</div>
        </Frame>
      );
    },
  },

  minimal: {
    label: "Minimalista",
    description: "Mucho aire, foto con bordes redondeados y texto sobrio.",
    slots: (W, H) => [{ w: W - 160, h: Math.round(H * (H > W * 1.4 ? 0.5 : 0.54)) }],
    render: (c) => {
      const box = TEMPLATES.minimal.slots(c.W, c.H)[0];
      const { text, accent } = c.d.colors;
      return (
        <Frame c={c}>
          <div style={col({ width: c.W, height: c.H, padding: "64px 80px", alignItems: c.d.align === "center" ? "center" : "flex-start", justifyContent: "space-between" })}>
            <div style={flex({ width: "100%", justifyContent: "space-between", alignItems: "center" })}>
              {Logo(c, 96) ?? <div />}
              <div style={flex({ ...c.body, fontSize: c.t(26), color: alpha(text, 0.6) })}>{c.data.province}</div>
            </div>
            {Photo(c, 0, box, { borderRadius: 36 })}
            <div style={col({ width: "100%", alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
              {Badge(c, { marginBottom: c.t(18), backgroundColor: "transparent", color: accent, border: `3px solid ${accent}` })}
              {Headline(c, 72, text)}
              <div style={flex({ width: "100%", justifyContent: c.d.align === "center" ? "center" : "space-between", alignItems: "flex-end", marginTop: c.t(16), flexWrap: "wrap" })}>
                {Price(c, 64, accent, { marginRight: 24 })}
                {Footer(c, text, { marginTop: c.t(12) })}
              </div>
              {Specs(c, text, alpha(text, 0.07))}
            </div>
          </div>
        </Frame>
      );
    },
  },

  oferta: {
    label: "Oferta",
    description: "Cinta diagonal y llamada a la acción a todo lo ancho.",
    slots: (W, H) => [{ w: W, h: H }],
    render: (c) => {
      const { text, accent, accentText } = c.d.colors;
      const ribbon = fillText(c.d.badge, c.data) || "Oferta";
      const cta = fillText(c.d.cta, c.data);
      return (
        <Frame c={c}>
          <div style={cover(c)}>{Photo(c, 0, { w: c.W, h: c.H })}</div>
          <div style={abs({ left: 0, right: 0, bottom: 0, height: c.H * 0.62, backgroundImage: veil(c) })} />
          {c.d.show.badge ? (
            <div style={abs({ top: 70, right: -150, width: 600, justifyContent: "center", backgroundColor: accent, transform: "rotate(45deg)", padding: "18px 0", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" })}>
              <div style={flex({ ...c.heading, fontSize: c.t(44), color: accentText, textTransform: "uppercase", letterSpacing: 4 })}>{ribbon}</div>
            </div>
          ) : null}
          <div style={abs({ top: 48, left: 48 })}>{Logo(c, 120)}</div>
          <div style={abs({ left: 56, right: 56, bottom: c.d.show.cta && cta ? 160 : 56, flexDirection: "column", alignItems: c.d.align === "center" ? "center" : "flex-start" })}>
            {Headline(c, 86, text)}
            {Price(c, 104, accent, { marginTop: c.t(18) })}
            {Specs(c, text, alpha(text, 0.16), { marginTop: c.t(6) })}
            {c.d.show.contact || c.d.show.financing ? Footer({ ...c, d: { ...c.d, show: { ...c.d.show, cta: false } } }, text, { marginTop: c.t(10) }) : null}
          </div>
          {c.d.show.cta && cta ? (
            <div style={abs({ left: 0, right: 0, bottom: 0, height: 120, backgroundColor: accent, alignItems: "center", justifyContent: "center" })}>
              <div style={flex({ ...c.heading, fontSize: c.t(46), color: accentText })}>{cta}</div>
            </div>
          ) : null}
        </Frame>
      );
    },
  },
};

/** Cajas de las fotos del diseño (para que el servidor las recorte a la medida exacta). */
export function photoSlots(d: AdDesign, W: number, H: number) {
  return TEMPLATES[d.template].slots(W, H);
}

/** El anuncio completo como elemento de React de `W`×`H` píxeles. */
export function renderAd(d: AdDesign, data: AdData, W: number, H: number, paint: Painter): ReactElement {
  const template = TEMPLATES[d.template];
  const heading = FONTS[d.headingFont];
  const body = FONTS[d.bodyFont];
  return template.render({
    d,
    data,
    W,
    H,
    t: (px) => Math.round(px * d.textScale),
    heading: { fontFamily: heading.family, fontWeight: heading.heading, textTransform: d.uppercase ? "uppercase" : "none", letterSpacing: d.uppercase ? 1 : 0 },
    body: { fontFamily: body.family, fontWeight: 500 },
    bold: { fontFamily: body.family, fontWeight: 700 },
    photos: adPhotos(d, data, template.slots(W, H).length),
    paint,
  });
}
