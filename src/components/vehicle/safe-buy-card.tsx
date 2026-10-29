import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { DGII_PLATE_LOOKUP_URL } from "@/lib/vehicle-id";

/** Lista corta de verificaciones antes de pagar, en la ficha; la guía completa está en /compra-segura. */
export function SafeBuyCard({ plate, used }: { plate: string | null; used: boolean }) {
  const steps = [
    plate ? (
      <>
        Consulta la placa <strong>{plate}</strong> en la DGII para saber si tiene oposiciones. Te pedirá la cédula o el RNC del propietario: pídeselos al vendedor.
      </>
    ) : (
      "Pide la placa y la cédula o el RNC del propietario y consulta en la DGII si el vehículo tiene oposiciones."
    ),
    "Compara el chasis y el motor del vehículo con los de la matrícula original.",
    used ? "Lleva el vehículo a un mecánico de tu confianza antes de pagar." : "Confirma con el dealer la garantía y si la primera placa está incluida en el precio.",
    "No hagas pagos ni depósitos de reserva sin haber visto el vehículo y los documentos.",
  ];
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="wide flex items-center gap-2 font-bold">
        <ShieldCheck className="size-5 text-ok" aria-hidden />
        Compra segura
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm marker:font-bold marker:text-muted">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a href={DGII_PLATE_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
          Consultar placa en la DGII <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <Link href="/compra-segura" className="inline-flex items-center gap-1 text-brand hover:underline">
          Guía completa de compra <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
