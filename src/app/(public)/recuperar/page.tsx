import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { SimpleForm } from "@/components/forms/simple-form";
import { input, label } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: true } };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Recuperar contraseña</h1>
      <p className="mt-2 text-muted">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <SimpleForm action={requestPasswordReset} submit="Enviar enlace">
          <div>
            <label htmlFor="email" className={label}>
              Correo electrónico
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>
        </SimpleForm>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
