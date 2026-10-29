import "server-only";
import { createAuthToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { resetPasswordTemplate, verifyEmailTemplate } from "@/lib/email-templates";
import { siteUrl } from "@/lib/seo";

type Recipient = { id: string; name: string; email: string };

export const VERIFY_TTL_MS = 48 * 3_600_000;
export const RESET_TTL_MS = 3_600_000;

/** Correos de la cuenta. Se llaman dentro de `after()`: un fallo de Azure se registra y no rompe la página. */
export async function sendVerificationEmail(user: Recipient) {
  try {
    const token = await createAuthToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_MS);
    await sendEmail({ to: user.email, ...verifyEmailTemplate(user.name, siteUrl(`/verificar?token=${token}`)) });
  } catch (error) {
    console.error("[correo] verificación no enviada:", error);
  }
}

export async function sendPasswordResetEmail(user: Recipient) {
  try {
    const token = await createAuthToken(user.id, "RESET_PASSWORD", RESET_TTL_MS);
    await sendEmail({ to: user.email, ...resetPasswordTemplate(user.name, siteUrl(`/restablecer?token=${token}`)) });
  } catch (error) {
    console.error("[correo] recuperación no enviada:", error);
  }
}
