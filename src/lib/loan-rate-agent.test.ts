import { describe, expect, it } from "vitest";
import { findDocumentLink, validateExtraction } from "./loan-rate-agent";
import { htmlToText } from "./html";

describe("findDocumentLink", () => {
  const html = `<a href="/pages/historico-de-tarifarios/">Histórico</a>
    <a class="x" href='https://cdn.example.com/media/abc/tasas-de-referencia_2026-6.pdf'>Tasas</a>
    <a href="/wp-content/uploads/2019/03/Tarifario-Escala-de-Tasas-Activas.pdf?v=1&amp;x=2">Tarifario</a>`;

  it("devuelve el primer enlace que cumple el patrón", () => {
    expect(findDocumentLink(html, /["'](https:\/\/[^"']*\/tasas-de-referencia[^"']*\.pdf)/i, "https://www.banco.do/")).toBe("https://cdn.example.com/media/abc/tasas-de-referencia_2026-6.pdf");
  });

  it("resuelve rutas relativas y entidades HTML", () => {
    expect(findDocumentLink(html, /["']([^"']*Tarifario-Escala-de-Tasas[^"']*\.pdf[^"']*)/i, "https://www.apap.com.do/acerca-apap/tasas-de-interes/")).toBe(
      "https://www.apap.com.do/wp-content/uploads/2019/03/Tarifario-Escala-de-Tasas-Activas.pdf?v=1&x=2",
    );
  });

  it("encuentra URLs dentro de datos JSON de la página", () => {
    const page = `{name:"Tasas de referencia y pago de intereses abril",description:"",file:"https:\\u002F\\u002Fblob.example.net\\u002Fa.pdf?sig=x&amp;se=1"}`;
    expect(findDocumentLink(page, /name:"Tasas de referencia[^"]*",description:"[^"]*",file:"([^"]+)"/, "https://bsc.com.do/")).toBe("https://blob.example.net/a.pdf?sig=x&se=1");
  });

  it("null si no hay enlace", () => {
    expect(findDocumentLink(html, /no-existe\.pdf/, "https://www.banco.do/")).toBeNull();
  });
});

describe("htmlToText", () => {
  it("quita scripts, estilos y etiquetas y conserva los saltos de bloque", () => {
    const text = htmlToText(`<style>.a{}</style><script>var t = 99;</script><table><tr><td>Vehículos nuevos</td><td>Desde&nbsp;11.92%</td></tr><tr><td>Usados</td></tr></table>`);
    expect(text).toBe("Vehículos nuevos Desde 11.92%\nUsados");
  });
});

describe("validateExtraction", () => {
  const today = "2026-10-20";

  it("acepta tasas plausibles y se queda con la menor de cada condición", () => {
    const out = validateExtraction(
      {
        effectiveDate: "2026-10-05",
        rates: [
          { condition: "NEW", rate: 11.92, tae: 13.07 },
          { condition: "USED", rate: 20.45, tae: 22.05 },
          { condition: "USED", rate: 21.5, tae: null },
        ],
      },
      today,
    );
    expect(out.rates).toEqual([
      { condition: "NEW", rate: 11.92, tae: 13.07 },
      { condition: "USED", rate: 20.45, tae: 22.05 },
    ]);
    expect(out.effectiveDate?.toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("rechaza tasas imposibles (p. ej. una lectura en decimales)", () => {
    expect(() => validateExtraction({ effectiveDate: null, rates: [{ condition: "NEW", rate: 0.1192, tae: null }] }, today)).toThrow(/fuera de rango/);
    expect(() => validateExtraction({ effectiveDate: null, rates: [{ condition: "NEW", rate: 12, tae: 8 }] }, today)).toThrow(/TAE/);
  });

  it("falla si el documento no trae tasas de vehículos", () => {
    expect(() => validateExtraction({ effectiveDate: "2026-10-01", rates: [] }, today)).toThrow(/no trae tasas/);
  });

  it("descarta fechas futuras o mal formadas", () => {
    const rates = [{ condition: "NEW" as const, rate: 12, tae: null }];
    expect(validateExtraction({ effectiveDate: "2027-01-01", rates }, today).effectiveDate).toBeNull();
    expect(validateExtraction({ effectiveDate: "5 de octubre", rates }, today).effectiveDate).toBeNull();
  });
});
