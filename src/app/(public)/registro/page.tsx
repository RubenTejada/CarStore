import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, safeNext } from "@/lib/auth";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false, follow: true } };

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { tipo, siguiente } = await searchParams;
  const kind = tipo === "dealer" ? "dealer" : tipo === "comprador" ? "comprador" : "particular";
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="display text-3xl">Crear cuenta</h1>
      <p className="mt-2 text-muted">Guarda vehículos y recibe alertas, o publica los tuyos con fotos, características y ubicación.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <RegisterForm defaultKind={kind} provinces={PROVINCE_NAMES} next={safeNext(siguiente)} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
