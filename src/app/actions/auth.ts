"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthToken, createSession, destroySession, hashPassword, homeFor, requireUser, safeNext, verifyPassword } from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/account-email";
import { takeToken } from "@/lib/rate-limit";
import { PROVINCES, PROVINCE_NAMES } from "@/lib/provinces";
import { slugify } from "@/lib/labels";

export type FormState = { error?: string; ok?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Mismo mensaje para usuario inexistente y contraseña errónea.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "Correo o contraseña incorrectos." };
  if (!user.active) return { error: "Tu cuenta está desactivada. Contacta a la administración." };
  await createSession(user.id);
  redirect(safeNext(form.get("siguiente")) ?? homeFor(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const registerSchema = z
  .object({
    kind: z.enum(["particular", "dealer", "comprador"]),
    name: z.string().trim().min(2, "Escribe tu nombre").max(80),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    // El comprador puede dejarlo vacío: solo los vendedores lo muestran en sus anuncios.
    phone: z.string().trim().max(20).catch(""),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
    dealerName: z.string().trim().max(80).optional(),
    province: z.string().optional(),
  })
  .refine((d) => d.kind === "comprador" || d.phone.length >= 7, { message: "Escribe un teléfono válido" })
  .refine((d) => d.kind !== "dealer" || (d.dealerName && d.dealerName.length >= 2), {
    message: "Escribe el nombre del dealer",
  })
  .refine((d) => d.kind !== "dealer" || PROVINCE_NAMES.includes(d.province ?? ""), {
    message: "Selecciona la provincia del dealer",
  });

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } }))
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  const passwordHash = await hashPassword(d.password);
  let dealerId: string | null = null;
  if (d.kind === "dealer") {
    const center = PROVINCES.find((p) => p.name === d.province)!;
    let slug = slugify(d.dealerName!);
    if (await db.dealer.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const dealer = await db.dealer.create({
      data: { name: d.dealerName!, slug, province: center.name, lat: center.lat, lng: center.lng, phone: d.phone, email: d.email },
    });
    dealerId = dealer.id;
  }
  const user = await db.user.create({
    data: { email: d.email, name: d.name, phone: d.phone || null, passwordHash, role: d.kind === "dealer" ? "DEALER" : d.kind === "comprador" ? "BUYER" : "SELLER", dealerId },
  });
  await createSession(user.id);
  after(() => sendVerificationEmail(user));
  redirect(d.kind === "comprador" ? (safeNext(form.get("siguiente")) ?? "/cuenta") : "/panel");
}

/** Vuelve a enviar el enlace para confirmar el correo de la cuenta actual. */
export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: "Tu correo ya está confirmado." };
  if (!takeToken(`verify:${user.id}`, 3, 3_600_000)) return { error: "Ya te enviamos varios enlaces. Revisa tu correo (y la carpeta de spam) o intenta en una hora." };
  after(() => sendVerificationEmail(user));
  return { ok: `Te enviamos el enlace a ${user.email}.` };
}

export async function confirmEmail(_: FormState, form: FormData): Promise<FormState> {
  const userId = await consumeAuthToken(String(form.get("token") ?? ""), "VERIFY_EMAIL");
  if (!userId) return { error: "El enlace venció o ya se usó. Pide uno nuevo desde tu cuenta." };
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return { ok: "¡Listo! Tu correo quedó confirmado." };
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email("Correo inválido") });

/** Siempre responde lo mismo: no revela qué correos tienen cuenta. */
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  const sent = { ok: `Si ${email} tiene una cuenta, te llegará un enlace para elegir una contraseña nueva. Vence en una hora.` };
  if (!takeToken(`reset:${email}`, 3, 3_600_000) || !takeToken(`reset-ip:${ip}`, 10, 3_600_000)) return sent;
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, active: true } });
  if (user?.active) after(() => sendPasswordResetEmail(user));
  return sent;
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden" });

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const userId = await consumeAuthToken(parsed.data.token, "RESET_PASSWORD");
  if (!userId) return { error: "El enlace venció o ya se usó. Pide uno nuevo." };
  const passwordHash = await hashPassword(parsed.data.password);
  // Cambiar la contraseña cierra las demás sesiones; usar el enlace demuestra que el correo es suyo.
  const [user] = await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash }, select: { role: true, active: true } }),
    db.session.deleteMany({ where: { userId } }),
    db.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } }),
  ]);
  if (!user.active) return { ok: "Contraseña cambiada. Tu cuenta está desactivada: contacta a la administración." };
  await createSession(userId);
  redirect(homeFor(user.role));
}

/** Activa o desactiva las alertas por correo de la cuenta actual. */
export async function setAlerts(enabled: boolean): Promise<FormState> {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { alertsEnabled: enabled } });
  revalidatePath("/cuenta");
  return { ok: enabled ? "Alertas activadas." : "Alertas desactivadas." };
}

/** Baja de alertas desde el enlace del correo (sin sesión). */
export async function unsubscribeAlerts(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const { count } = token ? await db.user.updateMany({ where: { alertsToken: token }, data: { alertsEnabled: false } }) : { count: 0 };
  if (!count) return { error: "El enlace no es válido." };
  return { ok: "Listo: ya no recibirás alertas por correo. Puedes activarlas de nuevo desde tu cuenta." };
}
