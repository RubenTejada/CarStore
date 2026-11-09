import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { reviewLegalRequest } from "@/app/actions/legal";
import { PageTitle } from "@/components/panel/shell";
import { SimpleForm } from "@/components/forms/simple-form";
import { card, input, label } from "@/components/ui/styles";

const KINDS: Record<string, string> = { PRIVACY: "Datos personales", CONTENT: "Contenido y fraude", PAYMENT: "Pagos", OTHER: "Otra reclamación" };

export default async function LegalInbox({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requireUser("ADMIN");
  const raw = Number((await searchParams).pagina);
  const page = Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, 100_000) : 1;
  const [requests, total] = await Promise.all([
    db.legalRequest.findMany({ orderBy: [{ reviewedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * 50, take: 50 }),
    db.legalRequest.count(),
  ]);
  return (
    <div className="max-w-4xl">
      <PageTitle title="Reclamaciones y privacidad" text="Revisa este buzón a diario. Verifica identidad solo cuando sea necesario, atiende los plazos legales y documenta la respuesta por el canal de contacto del solicitante." />
      {!requests.length && <p>No hay solicitudes en esta página.</p>}
      <div className="space-y-6">{requests.map((r) => <article key={r.id} className={`${card} space-y-4 p-6`}>
        <header><h2 className="wide font-bold">{KINDS[r.kind] || r.kind} · {r.reviewedAt ? "Atendida" : "Pendiente"}</h2><p className="mt-1 break-all text-xs text-muted">{r.id} · {r.createdAt.toLocaleString("es-DO", { timeZone: "America/Santo_Domingo" })}</p></header>
        <p>{r.name} · <a href={`mailto:${r.email}`} className="text-brand underline">{r.email}</a></p>
        {r.reference && <p className="break-all text-sm">Referencia: {r.reference}</p>}
        <p className="whitespace-pre-wrap break-words">{r.message}</p>
        {r.reviewedAt ? <p className="whitespace-pre-wrap border-t border-line pt-4 text-sm">{r.reviewNote}</p> : <SimpleForm action={reviewLegalRequest.bind(null, r.id)} submit="Registrar atención"><div><label htmlFor={`review-${r.id}`} className={label}>Actuación, verificación y respuesta comunicada (nota interna)</label><textarea id={`review-${r.id}`} name="reviewNote" required minLength={20} maxLength={4000} rows={3} className={`${input} h-auto py-3`} /></div></SimpleForm>}
      </article>)}</div>
      <nav aria-label="Páginas de reclamaciones" className="mt-6 flex gap-5 text-brand underline">
        {page > 1 && <a href={`/admin/legal?pagina=${page - 1}`}>Anterior</a>}
        {page * 50 < total && <a href={`/admin/legal?pagina=${page + 1}`}>Siguiente</a>}
      </nav>
    </div>
  );
}
