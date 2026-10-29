"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { contactRequestTemplate } from "@/lib/email-templates";
import { takeToken } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/seo";
import { MAX_TEST_DRIVE_DAYS, testDriveWindow } from "@/lib/contact-request";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import type { FormState } from "./auth";

const schema = z.object({
  kind: z.enum(["INFO", "TEST_DRIVE"]),
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+.-]{7,20}$/, "Escribe un teléfono válido"),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Correo inválido").max(120)]),
  preferredDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")]),
  message: z.string().trim().max(1000, "El mensaje es muy largo"),
});

/** Solicitud «Me interesa» o de prueba de manejo desde la ficha: queda en el panel del vendedor y le llega por correo. */
export async function requestContact(vehicleId: string, _: FormState, form: FormData): Promise<FormState> {
  const done: FormState = { ok: "¡Enviado! El vendedor recibió tus datos y te contactará pronto." };
  // Campo trampa invisible: solo lo llenan los robots.
  if (form.get("website")) return done;
  const parsed = schema.safeParse({ email: "", preferredDate: "", message: "", ...Object.fromEntries(form) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const allowed = testDriveWindow();
  const date = d.kind === "TEST_DRIVE" ? d.preferredDate : "";
  if (date && (date < allowed.min || date > allowed.max)) return { error: `Elige una fecha entre hoy y los próximos ${MAX_TEST_DRIVE_DAYS} días.` };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  if (!takeToken(`contact:${ip}`, 5, 3_600_000)) return { error: "Enviaste varias solicitudes seguidas. Intenta de nuevo en un rato o escribe por WhatsApp." };

  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, year: true, status: true, model: { select: { name: true, brand: { select: { name: true } } } }, dealer: { select: { email: true } }, owner: { select: { email: true } } },
  });
  if (!vehicle || vehicle.status !== "ACTIVE") return { error: "Este vehículo ya no está disponible." };

  const preferredDate = date ? new Date(`${date}T00:00:00Z`) : null;
  await db.$transaction([
    db.contactRequest.create({ data: { vehicleId, kind: d.kind, name: d.name, phone: d.phone, email: d.email || null, message: d.message || null, preferredDate } }),
    db.leadEvent.create({ data: { vehicleId, kind: "FORM" } }),
  ]);

  const to = vehicle.dealer?.email ?? vehicle.owner.email;
  const title = `${vehicleTitle(vehicle)} ${vehicle.year}`;
  after(async () => {
    try {
      await sendEmail({
        to,
        replyTo: d.email || undefined,
        ...contactRequestTemplate({
          vehicle: title,
          vehicleUrl: siteUrl(vehicleUrl(vehicle)),
          panelUrl: siteUrl("/panel/solicitudes"),
          testDrive: d.kind === "TEST_DRIVE",
          name: d.name,
          phone: d.phone,
          email: d.email || null,
          preferredDate: preferredDate ? preferredDate.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : null,
          message: d.message || null,
        }),
      });
    } catch (error) {
      console.error("[correo] solicitud no enviada al vendedor:", error);
    }
  });
  return done;
}
