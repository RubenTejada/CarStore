import { describe, expect, it } from "vitest";
import { isPublicAddress, parsePublicUrl } from "./safe-fetch";

describe("isPublicAddress", () => {
  it("acepta direcciones públicas", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700::1111")).toBe(true);
  });

  it("rechaza la red interna, loopback, metadatos de la nube e IPv4 mapeadas", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
      expect(isPublicAddress(ip), ip).toBe(false);
  });
});

describe("parsePublicUrl", () => {
  it("normaliza URLs públicas y quita el fragmento", () => {
    expect(parsePublicUrl("https://www.supercarros.com/honda-crv/1608655/#fotos").href).toBe("https://www.supercarros.com/honda-crv/1608655/");
  });

  it.each([
    ["file:///etc/passwd", "http"],
    ["ftp://example.com/a", "http"],
    ["http://localhost:3000/", "puerto"],
    ["http://localhost/", "público"],
    ["http://127.0.0.1/", "público"],
    ["http://[::1]/", "público"],
    ["http://169.254.169.254/latest/meta-data", "público"],
    ["http://intranet/", "público"],
    ["https://user:pass@example.com/", "usuario"],
    ["no es url", "válida"],
  ])("rechaza %s", (url, msg) => {
    expect(() => parsePublicUrl(url)).toThrow(msg);
  });
});
