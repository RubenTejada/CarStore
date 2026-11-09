import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { isClaudeConfigured } from "@/lib/claude";
import { siteUrl } from "@/lib/seo";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";
import { isMetaConfigured } from "@/lib/social/meta";
import { loadAd, socialEnabled } from "@/lib/social/service";
import { PageTitle } from "@/components/panel/shell";
import { AdEditor, type PublishTarget } from "@/components/social/ad-editor";
import { PostsTable } from "@/components/social/posts-table";
import { SocialUpsell } from "@/components/social/upsell";
import { card } from "@/components/ui/styles";

export const metadata = { title: "Anuncio en redes" };

export default async function VehicleSocialAd({ params }: PageProps<"/panel/vehiculos/[id]/redes">) {
  const user = await requireUser("DEALER");
  if (!user.dealerId) redirect("/panel");
  const { id } = await params;
  const ad = await loadAd(id);
  if (!ad || ad.vehicle.dealerId !== user.dealerId || !canEditVehicle(user, ad.vehicle)) notFound();
  const title = `${vehicleTitle(ad.vehicle)} ${ad.vehicle.year}`;
  if (!(await socialEnabled(user.dealerId)))
    return (
      <>
        <PageTitle title={`Anuncio en redes · ${title}`} />
        <SocialUpsell />
      </>
    );

  const account = ad.vehicle.dealer?.socialAccount;
  const posts = await db.socialPost.findMany({ where: { vehicleId: id }, orderBy: { createdAt: "desc" }, take: 30 });
  const connected = !!account?.pageToken && !account.needsReconnect;
  const target: PublishTarget = {
    pageName: account?.pageToken ? account.pageName : null,
    igUsername: account?.pageToken ? account.igUsername : null,
    ready: connected && isMetaConfigured() && ad.vehicle.status === "ACTIVE",
    reason: !isMetaConfigured()
      ? "La conexión con Meta aún no está configurada en el portal."
      : !account?.pageToken
        ? "Conecta tu página de Facebook en Redes sociales para publicar."
        : account.needsReconnect
          ? "Meta pidió volver a conectar tu página en Redes sociales."
          : ad.vehicle.status !== "ACTIVE"
            ? "Publica el vehículo en el portal para poder publicarlo en redes."
            : undefined,
  };

  return (
    <>
      <PageTitle
        title={`Anuncio en redes · ${title}`}
        text={ad.vehicle.socialAd ? "Este vehículo tiene un anuncio propio." : "Usa el diseño por defecto del dealer; cualquier cambio que guardes queda solo para este vehículo."}
        action={
          <Link href="/panel/redes" className="text-sm font-semibold text-brand hover:underline">
            Volver a Redes sociales
          </Link>
        }
      />
      <AdEditor
        mode="vehicle"
        vehicleId={id}
        data={ad.data}
        portalUrl={siteUrl(vehicleUrl(ad.vehicle))}
        initialDesign={ad.design}
        initialCaption={ad.caption}
        target={target}
        aiCaption={isClaudeConfigured()}
        customized={!!ad.vehicle.socialAd}
      />
      <section className={`${card} mt-10`} aria-labelledby="posts-title">
        <h2 id="posts-title" className="wide border-b border-line p-5 font-bold">
          Publicaciones de este vehículo
        </h2>
        <PostsTable posts={posts} showVehicle={false} />
      </section>
    </>
  );
}
