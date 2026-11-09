import { submitLegalRequest } from "@/app/actions/legal";
import { SimpleForm } from "@/components/forms/simple-form";
import { LegalAcceptance, LegalLink } from "@/components/legal/acceptance";
import { input, label } from "@/components/ui/styles";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ path: "/legal/contacto", title: "Reclamaciones y derechos", description: "Reporta anuncios, reclama sobre planes o ejerce tus derechos sobre datos personales." });

export default async function LegalContactPage({ searchParams }: { searchParams: Promise<{ referencia?: string | string[] }> }) {
  const raw = (await searchParams).referencia;
  const reference = typeof raw === "string" ? raw.slice(0, 500) : "";
  return (
    <article className="max-w-2xl">
      <h1 className="display text-3xl">Reclamaciones y derechos</h1>
      <p className="mt-4 leading-relaxed">Reporta fraude, contenido que infringe tus derechos, problemas con pagos o solicita acceso, corrección, oposición, supresión o cierre de cuenta. No necesitas iniciar sesión. No incluyas contraseñas, tarjetas, cuentas bancarias ni copias de cédula.</p>
      <SimpleForm action={submitLegalRequest} submit="Registrar solicitud" className="mt-8">
        <div><label htmlFor="kind" className={label}>Tipo de solicitud</label><select id="kind" name="kind" className={input} defaultValue="CONTENT"><option value="CONTENT">Anuncio, fraude o propiedad intelectual</option><option value="PRIVACY">Datos personales o cierre de cuenta</option><option value="PAYMENT">Plan, pago, cancelación o reembolso</option><option value="OTHER">Otra reclamación</option></select></div>
        <div><label htmlFor="name" className={label}>Nombre</label><input id="name" name="name" required maxLength={100} autoComplete="name" className={input} /></div>
        <div><label htmlFor="email" className={label}>Correo para responderte</label><input id="email" name="email" type="email" required maxLength={150} autoComplete="email" className={input} /></div>
        <div><label htmlFor="reference" className={label}>Enlace del anuncio o referencia del plan (opcional)</label><input id="reference" name="reference" defaultValue={reference} maxLength={500} className={input} /></div>
        <div><label htmlFor="message" className={label}>Describe los hechos y qué solicitas</label><textarea id="message" name="message" required minLength={20} maxLength={4000} rows={7} className={`${input} h-auto py-3`} /></div>
        <LegalAcceptance>Autorizo el tratamiento de los datos de esta solicitud para su gestión y respuesta, según la <LegalLink doc="privacidad">Política de privacidad</LegalLink>.</LegalAcceptance>
      </SimpleForm>
      <p className="mt-6 text-sm text-muted">Conserva la referencia que aparecerá al enviarla. Este canal no sustituye servicios de emergencia ni impide acudir a Pro Consumidor o a las autoridades competentes.</p>
    </article>
  );
}
