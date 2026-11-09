import Link from "next/link";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav aria-label="Información legal" className="mb-10 flex flex-wrap gap-x-5 gap-y-3 border-b border-line pb-6 text-sm text-brand">
        <Link href="/legal" className="font-bold hover:underline">Información legal</Link>
        {Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => <Link key={slug} href={`/legal/${slug}`} className="hover:underline">{doc.title}</Link>)}
        <Link href="/legal/contacto" className="font-bold hover:underline">Reclamaciones y derechos</Link>
      </nav>
      {children}
    </div>
  );
}
