import { notFound } from "next/navigation";
import Link from "next/link";
import { LEGAL_DOCUMENTS, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";
import { LEGAL_CONTENT } from "@/lib/legal-content";
import { pageMetadata } from "@/lib/seo";

function getDocument(value: string) {
  return Object.hasOwn(LEGAL_DOCUMENTS, value) ? value as keyof typeof LEGAL_DOCUMENTS : null;
}

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((document) => ({ document }));
}

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const key = getDocument((await params).document);
  if (!key) return {};
  return pageMetadata({ path: `/legal/${key}`, ...LEGAL_DOCUMENTS[key] });
}

export default async function LegalDocument({ params }: { params: Promise<{ document: string }> }) {
  const key = getDocument((await params).document);
  if (!key) notFound();
  return (
    <article className="max-w-3xl">
      <h1 className="display text-3xl">{LEGAL_DOCUMENTS[key].title}</h1>
      <p className="mt-3 text-sm text-muted">Versión {LEGAL_VERSION} · {LEGAL_DATE}</p>
      <p className="mt-5 text-sm"><Link href="/legal" className="text-brand underline">Identificación del operador</Link> · <Link href="/legal/contacto" className="text-brand underline">Reclamaciones y derechos</Link></p>
      <div className="mt-10 space-y-9">{LEGAL_CONTENT[key].map((section) => <section key={section.title}><h2 className="wide text-xl font-bold">{section.title}</h2><div className="mt-3 space-y-3 leading-relaxed text-ink/85">{section.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></section>)}</div>
      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">Puedes guardar o imprimir esta página desde tu navegador para conservar las condiciones que has consultado.</p>
    </article>
  );
}
