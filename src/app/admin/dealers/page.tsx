import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setDealerStatus, toggleDealerVerified } from "@/app/actions/admin";
import { DEALER_STATUS_LABEL } from "@/lib/labels";
import { DealerStatus } from "@/generated/prisma/enums";
import { PageTitle } from "@/components/panel/shell";
import { ActionButton } from "@/components/panel/action-button";
import { DealerBadge } from "@/components/dealer/dealer-badge";
import { button, card } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

export default async function AdminDealers({ searchParams }: PageProps<"/admin/dealers">) {
  await requireUser("ADMIN");
  const { estado } = await searchParams;
  const status = Object.values(DealerStatus).find((s) => s === estado);
  const dealers = await db.dealer.findMany({
    where: { status },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { vehicles: true, users: true } }, users: { select: { email: true }, take: 1 } },
  });
  return (
    <>
      <PageTitle title="Dealers" text={`${dealers.length} dealers`} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {[undefined, ...Object.values(DealerStatus)].map((s) => (
          <Link key={s ?? "all"} href={s ? `?estado=${s}` : "?"} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", status === s ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface")}>
            {s ? DEALER_STATUS_LABEL[s] : "Todos"}
          </Link>
        ))}
      </nav>
      <ul className={`${card} divide-y divide-line`}>
        {dealers.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-4 p-4">
            <DealerBadge dealer={d} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-bold">
                {d.name}
                {d.verified && <BadgeCheck className="size-4 text-brand" aria-label="Verificado" />}
              </p>
              <p className="text-sm text-muted">
                {d.province}, {d._count.vehicles} vehículos, {d._count.users} usuarios{d.users[0] && `, ${d.users[0].email}`}
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", d.status === "APPROVED" ? "bg-ok/15 text-ok" : d.status === "PENDING" ? "bg-sun/25" : "bg-accent/15 text-accent")}>
              {DEALER_STATUS_LABEL[d.status]}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {d.status !== "APPROVED" && (
                <ActionButton action={setDealerStatus.bind(null, d.id, "APPROVED")} className={button("brand", "sm")}>
                  Aprobar
                </ActionButton>
              )}
              {d.status === "APPROVED" && (
                <ActionButton action={setDealerStatus.bind(null, d.id, "SUSPENDED")} confirm={`¿Suspender ${d.name}? Sus vehículos se pausarán.`} className={button("danger", "sm")}>
                  Suspender
                </ActionButton>
              )}
              <ActionButton action={toggleDealerVerified.bind(null, d.id)} className={button("ghost", "sm")}>
                {d.verified ? "Quitar verificado" : "Verificar"}
              </ActionButton>
              <Link href={`/admin/dealers/${d.id}`} className={button("outline", "sm")}>
                Editar
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
