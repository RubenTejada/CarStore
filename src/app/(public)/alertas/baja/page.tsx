import type { Metadata } from "next";
import { unsubscribeAlerts } from "@/app/actions/auth";
import { SimpleForm } from "@/components/forms/simple-form";

export const metadata: Metadata = { title: "Dejar de recibir alertas", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<"/alertas/baja">) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-3xl">Alertas por correo</h1>
      <p className="mt-2 text-muted">Dejarás de recibir los resúmenes de vehículos nuevos y rebajas. Tus búsquedas y guardados se conservan.</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <SimpleForm action={unsubscribeAlerts} submit="Dejar de recibir alertas" resetOnSuccess={false}>
          <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
        </SimpleForm>
      </div>
    </div>
  );
}
