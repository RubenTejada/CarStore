import Link from "next/link";
import { LEGAL_DATE, LEGAL_DOCUMENTS, LEGAL_VERSION, legalOperator } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ path: "/legal", title: "Información legal", description: "Operador, términos, privacidad, pagos y reclamaciones de TuCarroOnline." });
export const dynamic = "force-dynamic";

export default function LegalPage() {
  const o = legalOperator();
  return (
    <article className="space-y-8 leading-relaxed">
      <header><h1 className="display text-3xl">Información legal</h1><p className="mt-2 text-sm text-muted">Versión {LEGAL_VERSION} · {LEGAL_DATE}</p></header>
      <p>TuCarroOnline es un portal de anuncios de vehículos para República Dominicana. Los vendedores ofrecen sus vehículos y acuerdan la compraventa directamente con los compradores. El portal presta sus propios servicios de publicación y planes.</p>
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="wide text-xl font-bold">Identificación del operador</h2>
        <dl className="mt-4 space-y-3">
          <div><dt className="font-semibold">Nombre o razón social</dt><dd>{o.name || "Pendiente de informar por el operador."}</dd></div>
          {o.documentLast4 && <div><dt className="font-semibold">Cédula de identidad</dt><dd>Terminada en {o.documentLast4} (número completo reservado por privacidad).</dd></div>}
          <div><dt className="font-semibold">RNC</dt><dd>{o.rnc || "Pendiente de informar por el operador."}</dd></div>
          <div><dt className="font-semibold">Domicilio</dt><dd>{o.address || "Pendiente de informar por el operador."}</dd></div>
          <div><dt className="font-semibold">Contacto legal y privacidad</dt><dd>{o.email ? <a className="text-brand underline" href={`mailto:${o.email}`}>{o.email}</a> : <Link className="text-brand underline" href="/legal/contacto">Formulario de reclamaciones y derechos</Link>}</dd></div>
        </dl>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">{Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => <Link key={slug} href={`/legal/${slug}`} className="rounded-xl border border-line p-5 hover:border-brand"><h2 className="wide font-bold">{doc.title}</h2><p className="mt-2 text-sm text-muted">{doc.description}</p></Link>)}</div>
      <p>Para comunicar un anuncio fraudulento, una infracción de derechos, un problema con un plan o una solicitud sobre tus datos, utiliza <Link href="/legal/contacto" className="text-brand underline">Reclamaciones y derechos</Link>. Este canal no limita tu acceso a Pro Consumidor ni a las autoridades y tribunales competentes.</p>
      <section className="border-t border-line pt-6 text-sm">
        <h2 className="wide text-lg font-bold">Marco legal de referencia</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-brand">
          <li><a href="https://www.wipo.int/wipolex/en/legislation/details/11048" target="_blank" rel="noopener noreferrer" className="underline">Ley 358-05 sobre protección del consumidor</a></li>
          <li><a href="https://www.sb.gob.do/regulacion/leyes/ley-no-172-13-proteccion-de-los-datos/" target="_blank" rel="noopener noreferrer" className="underline">Ley 172-13 sobre protección de datos personales</a></li>
          <li><a href="https://indotel.gob.do/wp-content/uploads/2022/10/ley-no-126-02.pdf" target="_blank" rel="noopener noreferrer" className="underline">Ley 126-02 sobre comercio electrónico, documentos y firmas digitales</a></li>
          <li><a href="https://old.ogtic.gob.do/noticias/nueva-ley-310-14-regula-envio-de-correos-electronicos-comerciales-no-deseados/" target="_blank" rel="noopener noreferrer" className="underline">Ley 310-14 sobre correos electrónicos comerciales</a></li>
        </ul>
      </section>
    </article>
  );
}
