// Plantillas de los correos del portal: HTML sencillo (compatible con clientes de correo) y su versión en texto.
import { formatPrice } from "@/lib/labels";
import type { Currency } from "@/generated/prisma/enums";

const BRAND = "#0b1a36";
const ACCENT = "#d0142c";

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Block = { text: string; html?: string };
type Rendered = { subject: string; html: string; text: string };

/** Párrafos (texto plano, se escapan) o bloques con su propio HTML, un botón y un pie opcional. */
function layout(subject: string, blocks: (string | Block)[], cta?: { label: string; url: string }, footer?: Block): Rendered {
  const norm = blocks.map((b) => (typeof b === "string" ? { text: b, html: `<p style="margin:0 0 16px">${escapeHtml(b)}</p>` } : { text: b.text, html: b.html ?? `<p style="margin:0 0 16px">${escapeHtml(b.text)}</p>` }));
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#1b2333">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 20px;font-size:20px;font-weight:bold;color:${BRAND}">TuCarroOnline</p>
<div style="background:#ffffff;border-radius:12px;padding:28px;font-size:15px;line-height:1.5">
${norm.map((b) => b.html).join("\n")}${button}
</div>
${footer ? `<div style="padding:16px 4px;font-size:12px;color:#6b7280">${footer.html ?? escapeHtml(footer.text)}</div>` : ""}
</div></body></html>`;
  const text = [...norm.map((b) => b.text), cta ? `${cta.label}: ${cta.url}` : "", footer?.text ?? ""].filter(Boolean).join("\n\n");
  return { subject, html, text };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Hola";

export const verifyEmailTemplate = (name: string, url: string) =>
  layout(
    "Confirma tu correo en TuCarroOnline",
    [`Hola, ${firstName(name)}:`, "Confirma tu correo para recibir alertas de vehículos y poder recuperar tu cuenta si olvidas la contraseña. El enlace vence en 48 horas."],
    { label: "Confirmar mi correo", url },
    { text: "Si no creaste una cuenta en TuCarroOnline, ignora este correo." },
  );

export const resetPasswordTemplate = (name: string, url: string) =>
  layout(
    "Restablece tu contraseña de TuCarroOnline",
    [`Hola, ${firstName(name)}:`, "Recibimos una solicitud para cambiar la contraseña de tu cuenta. El enlace vence en una hora y solo se puede usar una vez."],
    { label: "Elegir una contraseña nueva", url },
    { text: "Si no lo pediste, ignora este correo: tu contraseña no cambia." },
  );

export type ContactRequestEmail = {
  vehicle: string;
  vehicleUrl: string;
  panelUrl: string;
  testDrive: boolean;
  name: string;
  phone: string;
  email: string | null;
  preferredDate: string | null;
  message: string | null;
};

export function contactRequestTemplate(r: ContactRequestEmail) {
  const rows: [string, string | null][] = [
    ["Nombre", r.name],
    ["Teléfono", r.phone],
    ["Correo", r.email],
    ["Fecha preferida", r.preferredDate],
    ["Mensaje", r.message],
  ];
  const filled = rows.filter((row): row is [string, string] => !!row[1]);
  return layout(
    r.testDrive ? `Solicitud de prueba de manejo: ${r.vehicle}` : `Un comprador está interesado en tu ${r.vehicle}`,
    [
      r.testDrive ? `Alguien quiere probar tu ${r.vehicle}. Contáctale para coordinar la cita:` : `Alguien quiere más información sobre tu ${r.vehicle}. Contáctale pronto:`,
      {
        text: filled.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `<table style="margin:0 0 16px;border-collapse:collapse">${filled.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${k}</td><td style="padding:4px 0;white-space:pre-line">${escapeHtml(v)}</td></tr>`).join("")}</table>`,
      },
      { text: `Anuncio: ${r.vehicleUrl}`, html: `<p style="margin:0 0 16px"><a href="${escapeHtml(r.vehicleUrl)}" style="color:${BRAND}">Ver el anuncio</a></p>` },
    ],
    { label: "Ver mis solicitudes", url: r.panelUrl },
    { text: "Recibes este correo porque publicaste el vehículo en TuCarroOnline. Responde directamente al comprador." },
  );
}

export type AlertVehicle = { title: string; url: string; price: number; currency: Currency; detail: string; before?: number };
export type AlertDigest = { name: string; searches: { name: string; url: string; total: number; vehicles: AlertVehicle[] }[]; drops: AlertVehicle[]; accountUrl: string; unsubscribeUrl: string };

function vehicleBlock(v: AlertVehicle): Block {
  const price = formatPrice(v.price, v.currency);
  const before = v.before ? ` (antes ${formatPrice(v.before, v.currency)})` : "";
  return {
    text: `- ${v.title}: ${price}${before}, ${v.detail}\n  ${v.url}`,
    html: `<p style="margin:0 0 12px"><a href="${escapeHtml(v.url)}" style="color:${BRAND};font-weight:bold">${escapeHtml(v.title)}</a><br><span style="color:${ACCENT};font-weight:bold">${price}</span>${before ? `<span style="color:#6b7280"> ${escapeHtml(before.trim())}</span>` : ""}<br><span style="color:#6b7280">${escapeHtml(v.detail)}</span></p>`,
  };
}

const heading = (text: string): Block => ({ text: text.toUpperCase(), html: `<h2 style="margin:24px 0 12px;font-size:17px;color:${BRAND}">${escapeHtml(text)}</h2>` });

export function alertDigestTemplate(d: AlertDigest) {
  const newCount = d.searches.reduce((n, s) => n + s.total, 0);
  const subject =
    newCount && d.drops.length
      ? `${newCount} vehículo${newCount === 1 ? "" : "s"} nuevo${newCount === 1 ? "" : "s"} y ${d.drops.length} rebaja${d.drops.length === 1 ? "" : "s"} para ti`
      : newCount
        ? `${newCount} vehículo${newCount === 1 ? "" : "s"} nuevo${newCount === 1 ? "" : "s"} en tus búsquedas`
        : `Bajó de precio ${d.drops.length === 1 ? "un vehículo que guardaste" : `${d.drops.length} vehículos que guardaste`}`;
  const blocks: (string | Block)[] = [`Hola, ${firstName(d.name)}:`];
  if (d.drops.length) blocks.push(heading("Bajaron de precio"), ...d.drops.map(vehicleBlock));
  for (const s of d.searches) {
    blocks.push(heading(`${s.name}: ${s.total} nuevo${s.total === 1 ? "" : "s"}`), ...s.vehicles.map(vehicleBlock));
    if (s.total > s.vehicles.length) blocks.push({ text: `Ver los ${s.total}: ${s.url}`, html: `<p style="margin:0 0 16px"><a href="${escapeHtml(s.url)}" style="color:${BRAND}">Ver los ${s.total}</a></p>` });
  }
  return layout(subject, blocks, { label: "Administrar mis alertas", url: d.accountUrl }, {
    text: `Recibes este resumen porque activaste alertas en TuCarroOnline. Para no recibir más: ${d.unsubscribeUrl}`,
    html: `Recibes este resumen porque activaste alertas en TuCarroOnline. <a href="${escapeHtml(d.unsubscribeUrl)}" style="color:#6b7280">Dejar de recibir alertas</a>.`,
  });
}
