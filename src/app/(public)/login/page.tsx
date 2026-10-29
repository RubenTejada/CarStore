import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, safeNext } from "@/lib/auth";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false, follow: true } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  const next = safeNext((await searchParams).siguiente);
  if (user) redirect(next ?? homeFor(user.role));
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Iniciar sesión</h1>
      <p className="mt-2 text-muted">Tus vehículos guardados, alertas y publicaciones.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <LoginForm next={next} />
        <p className="mt-4 text-center text-sm">
          <Link href="/recuperar" className="font-semibold text-brand hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href={next ? `/registro?tipo=comprador&siguiente=${encodeURIComponent(next)}` : "/registro"} className="font-semibold text-brand hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
