import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { latestRateFromSheet, latestUsdRate, sharedStrings, unzip } from "./bcrd";

// Reproduce la disposición del libro del BCRD: título combinado, encabezados en la fila 3
// y luego Año | Mes (índice a sharedStrings) | Día | Compra | Venta.
const STRINGS = ["Año", "Mes", "Día", "Compra", "Venta", "Sep", "Oct", "Jul ", "Aug", "Tasas de Cambio del dólar"];
const SST = `<sst>${STRINGS.map((s) => `<si><t xml:space="preserve">${s}</t></si>`).join("")}</sst>`;

const row = (r: number, year: number, month: number, day: number, buy: string, sell: string) =>
  `<row r="${r}"><c r="A${r}" s="3"><v>${year}</v></c><c r="B${r}" s="3" t="s"><v>${month}</v></c><c r="C${r}" s="30"><v>${day}</v></c>` +
  `<c r="D${r}" s="43"><v>${buy}</v></c><c r="E${r}" s="43"><v>${sell}</v></c></row>`;

const SHEET =
  `<worksheet><sheetData>` +
  `<row r="1"><c r="A1" s="50" t="s"><v>9</v></c><c r="B1" s="50"/></row>` +
  `<row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3" t="s"><v>1</v></c><c r="C3" t="s"><v>2</v></c><c r="D3" t="s"><v>3</v></c><c r="E3" t="s"><v>4</v></c></row>` +
  row(4, 2026, 5, 15, "61.2578", "61.7717") +
  row(5, 2026, 6, 16, "61.364899999999999", "61.8322") +
  // Un día sin dato no es una tasa de cero.
  `<row r="6"><c r="A6"><v>2026</v></c><c r="B6" t="s"><v>6</v></c><c r="C6"><v>19</v></c><c r="D6"/><c r="E6"/></row>` +
  `</sheetData></worksheet>`;

/** ZIP mínimo (como un .xlsx) con entradas deflate o guardadas. */
function zip(files: Record<string, string>, deflate = true) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const data = deflate ? deflateRawSync(Buffer.from(text)) : Buffer.from(text);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(deflate ? 8 : 0, 10);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const dir = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, dir, eocd]));
}

const workbook = (sheetPath: string) => ({
  "xl/workbook.xml": `<workbook><sheets><sheet name="Diaria" sheetId="1" r:id="rId7"/><sheet name="PromMensual" sheetId="2" r:id="rId1"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId7" Target="${sheetPath}"/></Relationships>`,
  "xl/sharedStrings.xml": SST,
  "xl/worksheets/sheet1.xml": "<worksheet><sheetData/></worksheet>",
  "xl/worksheets/sheet9.xml": SHEET,
});

describe("latestRateFromSheet", () => {
  it("returns the most recent dated row with a rate", () => {
    expect(latestRateFromSheet(SHEET, sharedStrings(SST))).toEqual({ date: "2026-10-16", buy: 61.3649, sell: 61.8322 });
  });

  it("accepts trimmed and English month names", () => {
    const sheet = `<sheetData>${row(4, 2025, 7, 1, "59", "60")}${row(5, 2025, 8, 4, "60", "61")}</sheetData>`;
    expect(latestRateFromSheet(sheet, sharedStrings(SST))).toEqual({ date: "2025-08-04", buy: 60, sell: 61 });
  });

  it("returns null for an unrelated sheet", () => {
    expect(latestRateFromSheet(`<sheetData><row r="1"><c r="A1" t="s"><v>9</v></c></row></sheetData>`, sharedStrings(SST))).toBeNull();
  });
});

describe("latestUsdRate", () => {
  it("reads the first sheet of a deflated workbook through its relationships", () => {
    expect(latestUsdRate(zip(workbook("worksheets/sheet9.xml")))?.sell).toBe(61.8322);
  });

  it("reads stored (uncompressed) entries and absolute targets", () => {
    expect(latestUsdRate(zip(workbook("/xl/worksheets/sheet9.xml"), false))?.date).toBe("2026-10-16");
  });

  it("rejects files that are not a zip", () => {
    expect(() => unzip(new TextEncoder().encode("esto no es un libro de Excel"))).toThrow(/ZIP/);
  });
});
