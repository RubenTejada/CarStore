import { EmailClient } from "@azure/communication-email";

/**
 * Envío de correos con Azure Communication Services. Configuración: `AZURE_COMMUNICATION_CONNECTION_STRING`
 * (cadena de conexión del recurso de Communication Services) y `EMAIL_FROM` (remitente de un dominio
 * verificado en ese recurso, p. ej. `DoNotReply@tucarroonline.com`). Sin configurar, en desarrollo el
 * correo se escribe en la consola (con sus enlaces) y en producción se avisa en el log.
 * Sin dependencias de Next: también lo usa `scripts/send-alerts.ts`.
 */

export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };

export const isEmailConfigured = () => !!(process.env.AZURE_COMMUNICATION_CONNECTION_STRING && process.env.EMAIL_FROM);

let client: EmailClient | null = null;

/** Entrega el correo a Azure. Con `wait`, espera a que Azure lo procese (para los trabajos programados). */
export async function sendEmail(email: Email, { wait = false } = {}): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") console.warn(`[correo] sin configurar: no se envió «${email.subject}» a ${email.to}`);
    else console.info(`[correo] (desarrollo, no enviado) Para: ${email.to}\nAsunto: ${email.subject}\n${email.text}`);
    return;
  }
  client ??= new EmailClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING!);
  const poller = await client.beginSend({
    senderAddress: process.env.EMAIL_FROM!,
    content: { subject: email.subject, html: email.html, plainText: email.text },
    recipients: { to: [{ address: email.to }] },
    ...(email.replyTo && { replyTo: [{ address: email.replyTo }] }),
    ...(email.headers && { headers: email.headers }),
  });
  if (wait) {
    const result = await poller.pollUntilDone();
    if (result.status !== "Succeeded") throw new Error(`Azure no envió el correo (${result.status}): ${result.error?.message ?? ""}`);
  }
}
