import { describe, expect, it, vi } from "vitest";
import { normalizeDomain, officialDomainOf } from "./site-host";

vi.stubEnv("SITE_URL", "https://tucarroonline.com");

describe("normalizeDomain", () => {
  it("reduces what an admin would paste to the bare domain", () => {
    expect(normalizeDomain(" https://www.AutosPerez.com.do/inventario?x=1 ")).toBe("autosperez.com.do");
    expect(normalizeDomain("autosperez.com.do.")).toBe("autosperez.com.do");
    expect(normalizeDomain("autos-perez.do:443")).toBe("autos-perez.do");
  });

  it("rejects anything that is not a domain", () => {
    for (const bad of ["", "localhost", "autos perez.do", "-autos.do", "autos.d0", "autos..do", "autos_perez.do"]) expect(normalizeDomain(bad)).toBeNull();
  });
});

describe("officialDomainOf", () => {
  it("treats the portal, localhost and IPs as the portal", () => {
    for (const host of [null, "tucarroonline.com", "www.tucarroonline.com", "localhost:3000", "127.0.0.1:3000", "192.168.1.20", "[::1]:3000"]) expect(officialDomainOf(host)).toBeNull();
  });

  it("returns a dealer's own domain with or without www", () => {
    expect(officialDomainOf("www.autosperez.com.do")).toBe("autosperez.com.do");
    expect(officialDomainOf("AutosPerez.com.do:443")).toBe("autosperez.com.do");
    expect(officialDomainOf("autos.localhost:3000")).toBe("autos.localhost");
  });
});
