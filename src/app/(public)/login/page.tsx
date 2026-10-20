import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/panel");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Iniciar sesión</h1>
      <p className="mt-2 text-muted">Administra tus vehículos, tu dealer y tu plan.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
