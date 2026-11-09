import { redirect } from "next/navigation";
import { acceptAccountTerms } from "@/app/actions/legal";
import { logout } from "@/app/actions/auth";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LEGAL_VERSION } from "@/lib/legal";
import { SimpleForm } from "@/components/forms/simple-form";
import { LegalAcceptance, LegalLink } from "@/components/legal/acceptance";
import { button } from "@/components/ui/styles";

export const metadata = { title: "Revisa las condiciones de tu cuenta", robots: { index: false, follow: false } };

export default async function AcceptTermsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.legalVersion === LEGAL_VERSION) redirect(homeFor(user.role));
  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="display text-3xl">Revisa las condiciones de tu cuenta</h1>
      <p>Antes de gestionar tu cuenta, revisa las condiciones vigentes. Esta aceptación no activa alertas por correo. Puedes cerrar sesión y seguir consultando los anuncios públicos, o solicitar el cierre de tu cuenta en Reclamaciones y derechos.</p>
      <SimpleForm action={acceptAccountTerms} submit="Aceptar y continuar">
        <LegalAcceptance>Declaro que tengo al menos 18 años y facultad para representar al dealer, si corresponde. Acepto los <LegalLink doc="terminos">Términos de uso</LegalLink> y autorizo el tratamiento necesario para mi cuenta según la <LegalLink doc="privacidad">Política de privacidad</LegalLink>. Si publico vehículos, autorizo mostrar mis datos de contacto como vendedor.</LegalAcceptance>
      </SimpleForm>
      <form action={logout}><button className={button("outline")} type="submit">Cerrar sesión</button></form>
    </section>
  );
}
