import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { AuthTokenKind, Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "cs_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual (una consulta por request). */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          active: true,
          dealerId: true,
          emailVerifiedAt: true,
          alertsEnabled: true,
          dealer: { select: { id: true, name: true, slug: true, status: true, logoUrl: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Página de inicio de cada tipo de cuenta. */
export const homeFor = (role: Role) => (role === "ADMIN" ? "/admin" : role === "BUYER" ? "/cuenta" : "/panel");

/** Ruta interna a la que volver tras entrar o registrarse (`?siguiente=`); descarta URLs de otros sitios. */
export const safeNext = (value: unknown) => (typeof value === "string" && /^\/(?![\/\\])/.test(value) && value.length <= 500 ? value : null);

/** Enlace de un solo uso para el correo; reemplaza al anterior del mismo tipo. */
export async function createAuthToken(userId: string, kind: AuthTokenKind, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, kind } }),
    db.authToken.create({ data: { id: hashToken(token), userId, kind, expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return token;
}

/** Usa el enlace (una sola vez) y devuelve su usuario; `null` si no existe, es de otro tipo o venció. */
export async function consumeAuthToken(token: string, kind: AuthTokenKind) {
  const row = await db.authToken.findUnique({ where: { id: hashToken(token) } });
  if (!row || row.kind !== kind) return null;
  // Borrar primero: dos usos simultáneos del mismo enlace no pasan los dos.
  const { count } = await db.authToken.deleteMany({ where: { id: row.id } });
  return count && row.expiresAt > new Date() ? row.userId : null;
}

export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect("/");
  return user;
}
