import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import { vehicleUrl } from "@/lib/urls";
import { DEFAULT_DESIGN, parseDesign, type AdData } from "@/lib/social/design";
import { DEFAULT_CAPTION } from "@/lib/social/caption";
import { loadAd, socialEnabled } from "@/lib/social/service";
import { PageTitle } from "@/components/panel/shell";
import { AdEditor } from "@/components/social/ad-editor";
import { SocialUpsell } from "@/components/social/upsell";

export const metadata = { title: "Diseño por defecto" };

// Diseño y texto que reciben todos los vehículos sin anuncio propio (también en la publicación automática).
export default async function DefaultSocialDesign() {
  const user = await requireUser("DEALER");
  if (!user.dealerId) redirect("/panel");
  if (!(await socialEnabled(user.dealerId)))
    return (
      <>
        <PageTitle title="Diseño por defecto" />
        <SocialUpsell />
      </>
    );

  const [account, sample, dealer] = await Promise.all([
    db.socialAccount.findUnique({ where: { dealerId: user.dealerId } }),
    db.vehicle.findFirst({ where: { dealerId: user.dealerId, photos: { some: {} } }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
    db.dealer.findUniqueOrThrow({ where: { id: user.dealerId }, select: { name: true, logoUrl: true, phone: true, whatsapp: true, province: true } }),
  ]);
  const ad = sample ? await loadAd(sample.id) : null;
  // Sin vehículos, una muestra con los datos del dealer.
  const data: AdData = ad?.data ?? {
    brand: "Toyota",
    model: "RAV4",
    title: "Toyota RAV4",
    year: new Date().getFullYear(),
    trim: "XLE",
    price: "RD$2,450,000",
    priceBefore: "RD$2,600,000",
    mileage: "25,000 km",
    condition: "Usado",
    transmission: "Automática",
    fuel: "Gasolina",
    province: dealer.province,
    dealerName: dealer.name,
    logoUrl: dealer.logoUrl,
    phone: dealer.whatsapp || dealer.phone,
    photos: [],
  };

  return (
    <>
      <PageTitle
        title="Diseño por defecto"
        text={`Lo usan los vehículos sin anuncio propio y la publicación automática. ${ad ? `Vista previa con tu ${ad.data.title} ${ad.data.year}.` : "Publica un vehículo con fotos para verlo con tus datos reales."}`}
        action={
          <Link href="/panel/redes" className="text-sm font-semibold text-brand hover:underline">
            Volver a Redes sociales
          </Link>
        }
      />
      <AdEditor
        mode="default"
        data={data}
        portalUrl={ad ? siteUrl(vehicleUrl(ad.vehicle)) : siteUrl("/vehiculos")}
        initialDesign={parseDesign(account?.defaultDesign ?? null, DEFAULT_DESIGN)}
        initialCaption={account?.captionTemplate ?? DEFAULT_CAPTION}
        target={{ pageName: account?.pageToken ? account.pageName : null, igUsername: account?.pageToken ? account.igUsername : null, ready: false }}
        aiCaption={false}
      />
    </>
  );
}
