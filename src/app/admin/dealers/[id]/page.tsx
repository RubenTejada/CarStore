import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateDealer } from "@/app/actions/dealer";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { DealerForm } from "@/components/forms/dealer-form";
import { PageTitle } from "@/components/panel/shell";

export default async function AdminDealerEdit({ params }: PageProps<"/admin/dealers/[id]">) {
  await requireUser("ADMIN");
  const dealer = await db.dealer.findUnique({ where: { id: (await params).id } });
  if (!dealer) notFound();
  return (
    <div className="max-w-4xl">
      <PageTitle title={`Editar ${dealer.name}`} />
      <DealerForm action={updateDealer.bind(null, dealer.id)} dealer={dealer} provinces={PROVINCE_NAMES} />
    </div>
  );
}
