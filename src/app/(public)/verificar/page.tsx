import type { Metadata } from "next";
import Link from "next/link";
import { confirmEmail } from "@/app/actions/auth";
import { SimpleForm } from "@/components/forms/simple-form";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false, follow: false } };

// Se confirma con un botón y no al abrir la página: los antivirus de correo abren los enlaces antes que la persona.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verificar">) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Confirma tu correo</h1>
      <p className="mt-2 text-muted">Así podrás recibir alertas de vehículos y recuperar tu cuenta si olvidas la contraseña.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        {typeof token === "string" && token ? (
          <SimpleForm action={confirmEmail} submit="Confirmar mi correo" resetOnSuccess={false}>
            <input type="hidden" name="token" value={token} />
          </SimpleForm>
        ) : (
          <p className="text-muted">Abre el enlace que te enviamos por correo.</p>
        )}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/cuenta" className="font-semibold text-brand hover:underline">
          Ir a mi cuenta
        </Link>
      </p>
    </div>
  );
}
