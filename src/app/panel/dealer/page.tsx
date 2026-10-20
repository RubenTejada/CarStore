import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateDealer } from "@/app/actions/dealer";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { DEALER_STATUS_LABEL } from "@/lib/labels";
import { DealerForm } from "@/components/forms/dealer-form";
import { PageTitle } from "@/components/panel/shell";

export default async function MyDealer() {
  const user = await requireUser("DEALER");
  const dealer = user.dealerId ? await db.dealer.findUnique({ where: { id: user.dealerId } }) : null;
  if (!dealer) notFound();
  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Mi dealer"
        text={`Estado: ${DEALER_STATUS_LABEL[dealer.status]}${dealer.verified ? ", verificado" : ""}`}
        action={
          dealer.status === "APPROVED" && (
            <Link href={`/dealers/${dealer.slug}`} className="text-sm font-semibold text-brand hover:underline">
              Ver perfil público
            </Link>
          )
        }
      />
      <DealerForm action={updateDealer.bind(null, dealer.id)} dealer={dealer} provinces={PROVINCE_NAMES} />
    </div>
  );
}
