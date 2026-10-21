import type { Metadata } from "next";
import { ExternalLink, Phone } from "lucide-react";
import { getFinancingData, type LoanOffer } from "@/lib/financing";
import { formatPct } from "@/lib/loan";
import { LoanCalculator } from "@/components/financing/loan-calculator";
import { LenderLogo } from "@/components/financing/lender-logo";
import type { Condition } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Financiamiento de vehículos",
  description: "Calcula la cuota de tu préstamo de vehículo y compara las tasas que publican los bancos y asociaciones de República Dominicana.",
};

const DEFAULT_PRICE = 1_500_000;

const TIPS: [string, string][] = [
  ["Tasa nominal y TAE", "La tasa «desde» es la nominal anual de referencia. La TAE suma el efecto de la capitalización mensual y es la que permite comparar el costo real entre entidades."],
  ["Inicial", "Cada entidad financia un porcentaje del valor del vehículo (tasado, en los usados). Un inicial mayor baja la cuota y, a menudo, la tasa que te ofrecen."],
  ["Costos además de la cuota", "Seguro del vehículo (endosado a la entidad), seguro de vida sobre el saldo, gastos legales del contrato de prenda o venta condicional y, en usados, la tasación."],
  ["Documentos habituales", "Cédula, carta de trabajo o comprobante de ingresos, estados de cuenta recientes y la cotización o factura proforma del vehículo."],
];

export default async function FinancingPage({ searchParams }: PageProps<"/financiamiento">) {
  const raw = await searchParams;
  const price = Number(raw.precio);
  const condition: Condition = raw.condicion === "usado" ? "USED" : "NEW";
  const { offers, others } = await getFinancingData();

  const byLender = new Map<string, Partial<Record<Condition, LoanOffer>>>();
  for (const o of offers) byLender.set(o.lender, { ...byLender.get(o.lender), [o.condition]: o });

  return (
    <>
      <PageHeader
        large
        title="Financiamiento de vehículos"
        description="Calcula tu cuota y compárala entre las entidades financieras con las tasas que publican en sus sitios oficiales, verificadas cada día."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section>
          <LoanCalculator offers={offers} price={Number.isInteger(price) && price > 0 ? price : DEFAULT_PRICE} condition={condition} />
        </section>

        <section className="mt-16">
          <h2 className="display text-2xl">Entidades que financian vehículos</h2>
          <p className="mt-1 text-muted">Tasas de referencia en pesos. La tasa final depende de tu perfil, el monto, el plazo y el vehículo.</p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Entidad</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Nuevos</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Usados</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verificada</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Contacto</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...byLender.values()].map((rates) => {
                  const any = (rates.NEW ?? rates.USED)!;
                  return (
                    <tr key={any.lender}>
                      <th scope="row" className="px-4 py-3 font-normal">
                        <span className="flex items-center gap-3">
                          <LenderLogo src={any.logo} />
                          <span>
                            <span className="block font-bold">{any.name}</span>
                            <span className="text-xs text-muted">{any.kind}</span>
                          </span>
                        </span>
                      </th>
                      {(["NEW", "USED"] as const).map((c) => (
                        <td key={c} className="px-4 py-3">
                          <RateCell offer={rates[c]} />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-xs text-muted">
                        {any.checkedOn}
                        {any.effectiveOn && <span className="block">vigente desde {any.effectiveOn}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ContactLinks loanUrl={any.loanUrl} phone={any.phone} />
                      </td>
                    </tr>
                  );
                })}
                {others.map((l) => (
                  <tr key={l.slug}>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="flex items-center gap-3">
                        <LenderLogo src={l.logo} />
                        <span>
                          <span className="block font-bold">{l.name}</span>
                          <span className="text-xs text-muted">{l.kind}</span>
                        </span>
                      </span>
                    </th>
                    <td colSpan={3} className="px-4 py-3 text-muted">
                      {l.pending ? "Tasa pendiente de verificación." : "No publica sus tasas en un documento que podamos verificar: consulta directamente."}
                      {l.terms && <span className="block text-xs">{l.terms}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ContactLinks loanUrl={l.loanUrl} phone={l.phone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Cada día leemos el documento oficial de tasas de cada entidad («Fuente oficial» en la calculadora). «Verificada» es la fecha de esa lectura; «vigente desde», la fecha que
            trae el documento.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="display text-2xl">Antes de pedir el préstamo</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {TIPS.map(([title, text]) => (
              <div key={title} className="rounded-xl border border-line bg-surface p-5">
                <dt className="wide font-bold">{title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink/85">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

function RateCell({ offer }: { offer?: LoanOffer }) {
  if (!offer) return <span className="text-muted">—</span>;
  const terms = [offer.maxFinancingPct !== null && `hasta ${offer.maxFinancingPct} %`, offer.maxTermMonths !== null && `${offer.maxTermMonths} meses`].filter(Boolean);
  return (
    <>
      <span className="font-semibold">Desde {formatPct(offer.rate)}</span>
      {offer.tae !== null && <span className="block text-xs text-muted">TAE {formatPct(offer.tae)}</span>}
      {terms.length > 0 && <span className="block text-xs text-muted">Financia {terms.join(", ")}</span>}
    </>
  );
}

function ContactLinks({ loanUrl, phone }: { loanUrl: string; phone: string | null }) {
  return (
    <span className="inline-flex flex-col items-end gap-1 whitespace-nowrap text-xs font-semibold">
      <a href={loanUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
        Ver préstamo <ExternalLink className="size-3" aria-hidden />
      </a>
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-muted hover:text-ink">
          <Phone className="size-3" aria-hidden />
          {phone}
        </a>
      )}
    </span>
  );
}
