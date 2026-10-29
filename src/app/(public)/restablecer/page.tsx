import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { SimpleForm } from "@/components/forms/simple-form";
import { input, label } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/restablecer">) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Elige una contraseña nueva</h1>
      <p className="mt-2 text-muted">Al cambiarla se cierran las sesiones abiertas en otros dispositivos.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        {typeof token === "string" && token ? (
          <SimpleForm action={resetPassword} submit="Guardar contraseña" resetOnSuccess={false}>
            <input type="hidden" name="token" value={token} />
            <div>
              <label htmlFor="password" className={label}>
                Contraseña nueva
              </label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
              <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres.</p>
            </div>
            <div>
              <label htmlFor="confirm" className={label}>
                Repite la contraseña
              </label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={input} />
            </div>
          </SimpleForm>
        ) : (
          <p className="text-muted">
            Abre el enlace que te enviamos por correo o{" "}
            <Link href="/recuperar" className="font-semibold text-brand hover:underline">
              pide uno nuevo
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
