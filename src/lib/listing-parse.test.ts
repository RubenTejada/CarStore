import { describe, expect, it } from "vitest";
import { decodeEntities, pageImages, pageLinks } from "./html";
import { canonicalUrl, inventoryDigest, listingDigest, matchModel, normalizeListing, pickLinks, type CatalogBrand, type ListingExtraction } from "./listing-parse";

const brands: CatalogBrand[] = [
  {
    id: "b-honda",
    name: "Honda",
    slug: "honda",
    models: [
      { id: "m-crv", name: "CR-V", slug: "cr-v", bodyType: "JEEPETA", trims: [{ id: "t-lx", name: "LX", slug: "lx" }] },
      { id: "m-civic", name: "Civic", slug: "civic", bodyType: "SEDAN", trims: [] },
    ],
  },
  { id: "b-mb", name: "Mercedes-Benz", slug: "mercedes-benz", models: [{ id: "m-gle", name: "GLE", slug: "gle", bodyType: "JEEPETA", trims: [] }] },
];
const features = [
  { slug: "camara-de-reversa", name: "Cámara de reversa" },
  { slug: "apple-carplay", name: "Apple CarPlay" },
];

// Extracto de un anuncio de SuperCarros (estructura real, datos reducidos).
const AD = `<html><head><title>Honda CR-V LX 2026  #1608655 - SuperCarros.com</title>
<meta property="og:url" content="https://www.supercarros.com/honda-crv/1608655/" />
<meta property="og:image" content="https://img.supercarros.com/AdsPhotos/800x600/5/14857693.jpg" />
<meta name="description" content="Honda CR-V LX 2026 en USD 46,900.00. Gasolina, Autom&#225;tica, 0.00 Mi." />
<script>var x = "<b>no</b>";</script></head>
<body><h1>Honda CR-V LX 2026</h1><p>Transmisi&oacute;n Autom&#225;tica</p>
<img src="https://img.supercarros.com/AdsPhotos/1024x768/0/14857691.jpg">
<img data-src="/AdsPhotos/1024x768/0/14857692.jpg">
<img src="/assets/img/logo.png"><img src="/assets/icons/whatsapp.svg">
<a href="/honda-crv/1608655/#fotos">Fotos</a><a href="/Dealers/bladybeato/">Ver Todas las Publicaciones</a>
</body></html>`;

describe("html", () => {
  it("decodifica entidades numéricas, con nombre y acentos", () => {
    expect(decodeEntities("Autom&#225;tica &aacute;rbol &ntilde; &amp; &#x41; &iexcl;Hola! &raro;")).toBe("Automática árbol ñ & A ¡Hola! &raro;");
  });

  it("recoge las imágenes candidatas sin logos ni íconos", () => {
    expect(pageImages(AD, "https://www.supercarros.com/honda-crv/1608655/")).toEqual([
      "https://img.supercarros.com/AdsPhotos/800x600/5/14857693.jpg",
      "https://img.supercarros.com/AdsPhotos/1024x768/0/14857691.jpg",
      "https://www.supercarros.com/AdsPhotos/1024x768/0/14857692.jpg",
    ]);
  });

  it("recoge los enlaces absolutos con su texto", () => {
    expect(pageLinks(AD, "https://www.supercarros.com/x/")).toEqual([
      { url: "https://www.supercarros.com/honda-crv/1608655/", text: "Fotos" },
      { url: "https://www.supercarros.com/Dealers/bladybeato/", text: "Ver Todas las Publicaciones" },
    ]);
  });
});

describe("listingDigest", () => {
  it("incluye metadatos, texto sin scripts y las imágenes numeradas", () => {
    const { text, images } = listingDigest(AD, "https://www.supercarros.com/honda-crv/1608655/");
    expect(text).toContain("description: Honda CR-V LX 2026 en USD 46,900.00. Gasolina, Automática, 0.00 Mi.");
    expect(text).toContain("Transmisión Automática");
    expect(text).not.toContain("var x");
    expect(text).toContain(`0: ${images[0]}`);
  });
});

describe("canonicalUrl", () => {
  it("usa og:url del mismo sitio (con o sin www)", () => {
    expect(canonicalUrl(AD, "https://supercarros.com/honda-crv/1608655/?ref=1")).toBe("https://www.supercarros.com/honda-crv/1608655/");
  });

  it("ignora un canónico de otro sitio", () => {
    const html = `<link rel="canonical" href="https://otro.com/a">`;
    expect(canonicalUrl(html, "https://www.corotos.com.do/anuncio/x?page=2#a")).toBe("https://www.corotos.com.do/anuncio/x?page=2");
  });
});

describe("inventoryDigest / pickLinks", () => {
  const html = `<a href="/honda-crv/1/">2026 Honda CR-V</a><a href="/honda-crv/1/">foto</a><a href="https://otro.com/x">Otro</a>
    <a href="/Dealers/d/?PagingPageSkip=1">2</a><a href="/Dealers/d/">Inicio</a>`;
  const { links, text } = inventoryDigest(html, "https://www.supercarros.com/Dealers/d/");

  it("solo lista enlaces del mismo sitio, sin la página actual", () => {
    expect(links).toEqual(["https://www.supercarros.com/honda-crv/1/", "https://www.supercarros.com/Dealers/d/?PagingPageSkip=1"]);
    expect(text).toContain("0: https://www.supercarros.com/honda-crv/1/ 2026 Honda CR-V");
  });

  it("descarta números fuera de la lista", () => {
    expect(pickLinks({ isInventoryPage: true, listings: [0, 0, 7, -1], nextPage: 9 }, links)).toEqual({ listings: ["https://www.supercarros.com/honda-crv/1/"], nextPage: null });
    expect(pickLinks({ isInventoryPage: true, listings: [], nextPage: 1 }, links).nextPage).toBe("https://www.supercarros.com/Dealers/d/?PagingPageSkip=1");
  });
});

describe("matchModel", () => {
  it("empareja sin distinguir guiones, espacios ni mayúsculas", () => {
    expect(matchModel(brands, "honda", "CRV")?.model?.id).toBe("m-crv");
    expect(matchModel(brands, "Mercedes Benz", "gle")?.model?.id).toBe("m-gle");
  });

  it("acepta el modelo con la versión pegada", () => {
    expect(matchModel(brands, "Mercedes-Benz", "GLE 450 4MATIC")?.model?.id).toBe("m-gle");
  });

  it("devuelve la marca sin modelo si el modelo no existe, y null sin marca", () => {
    expect(matchModel(brands, "Honda", "Pilot")).toEqual({ brand: brands[0], model: null });
    expect(matchModel(brands, "Changan", "CS55")).toBeNull();
  });
});

describe("normalizeListing", () => {
  const base: ListingExtraction = {
    isVehicleListing: true,
    title: "Honda CR-V LX 2026",
    brand: "Honda",
    model: "CR-V",
    trim: "lx",
    year: 2026,
    condition: "NEW",
    price: 46900.0,
    currency: "USD",
    mileage: 10,
    mileageUnit: "MI",
    bodyType: null,
    transmission: "AUTOMATIC",
    fuel: "GASOLINE",
    drivetrain: "FWD",
    engine: "4 cil. turbo",
    extColor: "Gris",
    intColor: "Negro",
    doors: 4,
    seats: 5,
    description: null,
    features: ["apple-carplay", "inventada"],
    province: "Distrito Nacional",
    photos: [2, 0, 2, 99],
  };
  const ctx = { sourceUrl: "https://www.supercarros.com/honda-crv/1608655/", images: ["a.jpg", "b.jpg", "c.jpg"], brands, features };

  it("lleva la extracción al catálogo y a los rangos del portal", () => {
    const l = normalizeListing(base, ctx, 2026);
    expect(l).toMatchObject({
      brandId: "b-honda",
      modelId: "m-crv",
      bodyType: "JEEPETA",
      trimId: "t-lx",
      trim: "LX",
      price: 46900,
      currency: "USD",
      mileageKm: 16,
      features: ["apple-carplay"],
      province: "Distrito Nacional",
      photoUrls: ["c.jpg", "a.jpg"],
    });
  });

  it("descarta valores fuera de rango y usa valores por defecto", () => {
    const l = normalizeListing({ ...base, model: "Pilot", year: 1800, price: 50, doors: 9, province: "Narnia", condition: null, transmission: null, bodyType: "PICKUP" }, ctx, 2026);
    expect(l).toMatchObject({ modelId: null, modelLabel: "Honda Pilot", year: null, price: null, doors: null, province: null, condition: "USED", transmission: "AUTOMATIC", bodyType: "PICKUP", trimId: null, trim: "lx" });
  });
});
