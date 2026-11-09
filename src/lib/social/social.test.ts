import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, FORMATS, TEMPLATE_IDS, adPhotos, coverCrop, fillText, parseDesign, type AdData } from "./design";
import { DEFAULT_CAPTION, fillCaption, hashtags, socialLink, visitNetwork } from "./caption";
import { photoSlots, renderAd } from "./templates";

const data: AdData = {
  brand: "Toyota",
  model: "RAV4",
  title: "Toyota RAV4",
  year: 2022,
  trim: null,
  price: "RD$1,850,000",
  priceBefore: null,
  mileage: "45,000 km",
  condition: "Usado",
  transmission: "Automática",
  fuel: "Gasolina",
  province: "Santo Domingo",
  dealerName: "Autos Peña",
  logoUrl: null,
  phone: null,
  photos: ["/a.webp", "/b.webp", "/c.webp"],
};

describe("parseDesign", () => {
  it("fills missing fields from the base and drops invalid ones", () => {
    const d = parseDesign({ template: "banda", colors: { accent: "#ff0000" }, zoom: 99, headingFont: "comic" }, DEFAULT_DESIGN);
    expect(d.template).toBe("banda");
    expect(d.colors).toEqual({ ...DEFAULT_DESIGN.colors, accent: "#ff0000" });
    expect(d.zoom).toBe(DEFAULT_DESIGN.zoom);
    expect(d.headingFont).toBe(DEFAULT_DESIGN.headingFont);
  });

  it("falls back to the base for garbage", () => {
    expect(parseDesign("nope")).toBe(DEFAULT_DESIGN);
  });
});

describe("fillText", () => {
  it("replaces placeholders and drops lines whose placeholders are all empty", () => {
    expect(fillText("{titulo} {año} {version}\nLlama al {telefono}\nFin", data)).toBe("Toyota RAV4 2022\nFin");
  });

  it("keeps unknown placeholders as written", () => {
    expect(fillText("Hola {desconocido}", data)).toBe("Hola {desconocido}");
  });
});

describe("adPhotos", () => {
  it("puts the chosen photos first and ignores ones the vehicle no longer has", () => {
    expect(adPhotos({ ...DEFAULT_DESIGN, photos: ["/c.webp", "/gone.webp"] }, data, 3)).toEqual(["/c.webp", "/a.webp", "/b.webp"]);
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wide photo for a square box, centered", () => {
    expect(coverCrop(2000, 1000, 1080, 1080, 1, 50, 50)).toEqual({ left: 500, top: 0, width: 1000, height: 1000 });
  });

  it("zooms around the focus point", () => {
    expect(coverCrop(2000, 1000, 1080, 1080, 2, 0, 100)).toEqual({ left: 0, top: 500, width: 500, height: 500 });
  });
});

describe("caption", () => {
  it("adds the network to the link and fills hashtags", () => {
    const link = socialLink("https://tucarroonline.com/vehiculos/x/toyota-rav4-2022", "INSTAGRAM");
    expect(link).toBe("https://tucarroonline.com/vehiculos/x/toyota-rav4-2022?utm_source=instagram&utm_medium=social");
    const text = fillCaption(DEFAULT_CAPTION, data, link);
    expect(text).toContain(link);
    expect(text).not.toContain("Escríbenos al");
    expect(text).toContain("#ToyotaRAV4");
  });

  it("builds hashtags without accents or spaces", () => {
    expect(hashtags({ ...data, dealerName: "Peña Motors" })).toContain("#PenaMotors");
  });

  it("recognizes social visits", () => {
    expect(visitNetwork("Facebook")).toBe("FACEBOOK");
    expect(visitNetwork("ig")).toBe("INSTAGRAM");
    expect(visitNetwork("google")).toBeNull();
    expect(visitNetwork(["facebook"])).toBeNull();
  });
});

describe("templates", () => {
  it("render every template in every format", () => {
    for (const template of TEMPLATE_IDS)
      for (const [format, { width, height }] of Object.entries(FORMATS)) {
        const d = { ...DEFAULT_DESIGN, template, format: format as keyof typeof FORMATS };
        const slots = photoSlots(d, width, height);
        expect(slots.length).toBeGreaterThan(0);
        for (const s of slots) expect(s.w > 0 && s.h > 0 && s.w <= width && s.h <= height).toBe(true);
        expect(renderAd(d, data, width, height, { logo: null, photo: () => createElement("img", { alt: "" }) })).toBeTruthy();
      }
  });
});
