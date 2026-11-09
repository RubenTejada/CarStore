import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateDealer } from "@/app/actions/dealer";
import { setDealerDomain } from "@/app/actions/admin";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { hasOfficialSite, officialUrl } from "@/lib/official-site";
import { DealerForm } from "@/components/forms/dealer-form";
import { SimpleForm } from "@/components/forms/simple-form";
import { PageTitle } from "@/components/panel/shell";
import { card, input, label } from "@/components/ui/styles";

export default async function AdminDealerEdit({ params }: PageProps<"/admin/dealers/[id]">) {
  await requireUser("ADMIN");
  const dealer = await db.dealer.findUnique({ where: { id: (await params).id } });
  if (!dealer) notFound();
  const official = await hasOfficialSite(dealer.id);
  return (
    <div className="max-w-4xl">
      <PageTitle title={`Editar ${dealer.name}`} />
      <DealerForm action={updateDealer.bind(null, dealer.id)} dealer={dealer} provinces={PROVINCE_NAMES} />
      <section className={`${card} mt-8 p-6`}>
        <h2 className="wide text-lg font-bold">Página oficial con dominio propio</h2>
        <p className="mt-1 text-sm text-muted">
          {official ? "Tiene el plan Página Oficial vigente." : "No tiene el plan Página Oficial vigente: el dominio redirige a su perfil en el portal hasta que lo active."}{" "}
          {dealer.customDomain && official && (
            <a href={officialUrl(dealer.customDomain)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              Abrir {dealer.customDomain}
            </a>
          )}
        </p>
        <SimpleForm action={setDealerDomain.bind(null, dealer.id)} submit="Guardar dominio" resetOnSuccess={false} className="mt-4">
          <div className="max-w-md">
            <label htmlFor="customDomain" className={label}>
              Dominio
            </label>
            <input id="customDomain" name="customDomain" defaultValue={dealer.customDomain ?? ""} placeholder="tudealer.com.do" className={input} />
            <p className="mt-1 text-sm text-muted">Sirve con y sin «www.». Déjalo vacío para retirarlo.</p>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>El dealer apunta su dominio y el «www.» a la App Service: un registro CNAME o A, más el TXT asuid de verificación.</li>
            <li>Agrega ambos dominios en la App Service (Dominios personalizados) con su certificado administrado.</li>
            <li>Guarda aquí el dominio.</li>
          </ol>
        </SimpleForm>
      </section>
    </div>
  );
}
