import { describe, expect, it } from "vitest";
import { alertDigestTemplate, contactRequestTemplate, escapeHtml, resetPasswordTemplate } from "./email-templates";

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("templates", () => {
  it("include the action link in html and text", () => {
    const t = resetPasswordTemplate("Ana María", "https://tucarroonline.com/restablecer?token=abc");
    expect(t.text).toContain("Hola, Ana:");
    expect(t.text).toContain("https://tucarroonline.com/restablecer?token=abc");
    expect(t.html).toContain('href="https://tucarroonline.com/restablecer?token=abc"');
  });

  it("escapes what a visitor writes in a contact request", () => {
    const t = contactRequestTemplate({
      vehicle: "Toyota RAV4 2020",
      vehicleUrl: "https://x/v",
      panelUrl: "https://x/panel/solicitudes",
      testDrive: true,
      name: "<script>alert(1)</script>",
      phone: "809-555-0101",
      email: null,
      preferredDate: "30 de octubre",
      message: null,
    });
    expect(t.subject).toBe("Solicitud de prueba de manejo: Toyota RAV4 2020");
    expect(t.html).not.toContain("<script>");
    expect(t.text).toContain("Fecha preferida: 30 de octubre");
    expect(t.text).not.toContain("Correo:");
  });

  it("summarizes new matches and price drops", () => {
    const v = { title: "Honda CR-V 2020", url: "https://x/v1", price: 1_800_000, currency: "DOP" as const, detail: "45,000 km, Santiago" };
    const t = alertDigestTemplate({
      name: "Luis",
      searches: [{ name: "Jeepetas Honda", url: "https://x/s", total: 7, vehicles: [v] }],
      drops: [{ ...v, before: 1_900_000 }],
      accountUrl: "https://x/cuenta",
      unsubscribeUrl: "https://x/alertas/baja?token=t",
    });
    expect(t.subject).toBe("7 vehículos nuevos y 1 rebaja para ti");
    expect(t.text).toContain("Ver los 7: https://x/s");
    expect(t.text).toContain("antes RD$1,900,000");
    expect(t.html).toContain("https://x/alertas/baja?token=t");
  });
});
