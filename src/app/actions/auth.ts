"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
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
  redirect(user.role === "ADMIN" ? "/admin" : "/panel");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const registerSchema = z
  .object({
    kind: z.enum(["particular", "dealer"]),
    name: z.string().trim().min(2, "Escribe tu nombre").max(80),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    phone: z.string().trim().min(7, "Escribe un teléfono válido").max(20),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
    dealerName: z.string().trim().max(80).optional(),
    province: z.string().optional(),
  })
  .refine((d) => d.kind === "particular" || (d.dealerName && d.dealerName.length >= 2), {
    message: "Escribe el nombre del dealer",
  })
  .refine((d) => d.kind === "particular" || PROVINCE_NAMES.includes(d.province ?? ""), {
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
    data: { email: d.email, name: d.name, phone: d.phone, passwordHash, role: d.kind === "dealer" ? "DEALER" : "SELLER", dealerId },
  });
  await createSession(user.id);
  redirect("/panel");
}
