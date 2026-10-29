import Link from "next/link";
import { CalendarCheck, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountScope } from "@/lib/listing-rules";
import { vehicleTitle, whatsappUrl } from "@/lib/urls";
import { PageTitle } from "@/components/panel/shell";
import { button, card } from "@/components/ui/styles";
import { cn } from "@/lib/cn";

const dateTime = (d: Date) => d.toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Santo_Domingo" });

export default async function ContactRequests() {
  const user = await requireUser("DEALER", "SELLER");
  const requests = await db.contactRequest.findMany({
    where: { vehicle: accountScope(user) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { vehicle: { select: { id: true, year: true, model: { select: { name: true, brand: { select: { name: true } } } } } } },
  });

  return (
    <>
      <PageTitle title="Solicitudes" text="Compradores que pidieron información o una prueba de manejo desde tus anuncios. También te llegan por correo." />
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center">
          <p className="display text-2xl">Todavía no hay solicitudes</p>
          <p className="mt-2 text-muted">Aparecen aquí cuando un comprador usa «Me interesa» o «Prueba de manejo» en uno de tus vehículos.</p>
        </div>
      ) : (
        <ul className={cn(card, "divide-y divide-line")}>
          {requests.map((r) => {
            const testDrive = r.kind === "TEST_DRIVE";
            const title = `${vehicleTitle(r.vehicle)} ${r.vehicle.year}`;
            return (
              <li key={r.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", testDrive ? "bg-brand/15 text-brand" : "bg-surface-2")}>
                      {testDrive ? <CalendarCheck className="size-3.5" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
                      {testDrive ? "Prueba de manejo" : "Me interesa"}
                    </span>
                    <span className="text-muted">{dateTime(r.createdAt)}</span>
                  </p>
                  <p className="mt-2 font-bold">{r.name}</p>
                  <p className="text-sm text-muted">
                    Por el{" "}
                    <Link href={`/panel/vehiculos/${r.vehicle.id}`} className="font-medium text-ink hover:underline">
                      {title}
                    </Link>
                    {r.preferredDate && (
                      <>
                        {" · "}
                        <span className="font-semibold text-ink">
                          Prefiere el {r.preferredDate.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                        </span>
                      </>
                    )}
                  </p>
                  {r.message && <p className="mt-2 max-w-prose text-sm whitespace-pre-line">{r.message}</p>}
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                  <a href={whatsappUrl(r.phone, `Hola ${r.name}, te escribo por el ${title} que viste en TuCarroOnline.`)} target="_blank" rel="noopener noreferrer" className={button("outline", "sm")}>
                    <MessageCircle className="size-4" aria-hidden />
                    WhatsApp
                  </a>
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className={button("outline", "sm")}>
                    <Phone className="size-4" aria-hidden />
                    {r.phone}
                  </a>
                  {r.email && (
                    <a href={`mailto:${r.email}`} className={button("outline", "sm")}>
                      <Mail className="size-4" aria-hidden />
                      Correo
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
