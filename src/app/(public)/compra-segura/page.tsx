import { ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/labels";
import { DGII_PLATE_LOOKUP_URL } from "@/lib/vehicle-id";
import { MARBETE, REGISTRATION_PRINT_FEE, TRANSFER_TAX_PCT } from "@/lib/purchase-cost";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = pageMetadata({
  path: "/compra-segura",
  title: "Cómo comprar un carro usado de forma segura en República Dominicana",
  description: "Verifica la placa en la DGII, revisa la matrícula, haz el contrato y el traspaso a tiempo. Pasos, costos y enlaces oficiales para comprar un vehículo usado sin sorpresas.",
});

const SOURCES: [string, string][] = [
  ["DGII: Trámites de traspaso de vehículos de motor", "https://dgii.gov.do/publicacionesOficiales/bibliotecaVirtual/registrados/vehiculosMotor/Documents/Paso%20No.%201%20Tr%C3%A1mites%20Traspaso%20de%20Veh%C3%ADculos%20de%20Motor.pdf"],
  ["DGII: Consulta de placas", DGII_PLATE_LOOKUP_URL],
  ["PwC: Norma General 03-25 sobre traspasos", "https://pwc.com/ia/es/publicaciones/Noticias-Tax-Legal/Tax-and-legal-2025/traspaso-y-endoso-de-vehiculos-de-motor-y-remolques-nuevos-y-usado.pdf"],
];

export default function SafeBuyGuide() {
  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Verifica la placa en la DGII",
      body: (
        <>
          Con la placa y la cédula o el RNC del propietario, la{" "}
          <a href={DGII_PLATE_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
            consulta de placas de la DGII
          </a>{" "}
          te dice si el vehículo tiene oposiciones (por ejemplo, un embargo o un traspaso pendiente) y si el marbete está vigente. Si el vendedor no quiere darte esos datos, desconfía.
        </>
      ),
    },
    {
      title: "Revisa la matrícula original",
      body: "El nombre del propietario debe coincidir con la cédula de quien vende (o con un poder notarial). Compara el número de chasis y de motor de la matrícula con los del vehículo: en el chasis suelen estar en el marco del parabrisas y en la puerta del conductor.",
    },
    {
      title: "Pide una certificación del vehículo",
      body: "En la DGII puedes solicitar una certificación que confirma quién es el propietario registrado y el estado legal del vehículo. Pídela antes de pagar, sobre todo si el precio está muy por debajo del mercado.",
    },
    {
      title: "Hazlo revisar por un mecánico",
      body: "Una inspección independiente detecta choques reparados, inundaciones, fugas y desgaste que no se ven en las fotos. Prueba el vehículo en calle y en autopista.",
    },
    {
      title: "Firma un contrato de venta notarizado",
      body: "El contrato de compraventa se firma ante notario y luego se legaliza en la Procuraduría General de la República. Es el documento que necesitas para el traspaso.",
    },
    {
      title: "Haz el traspaso a tiempo",
      body: (
        <>
          En la DGII pagas el impuesto de traspaso ({TRANSFER_TAX_PCT} % del valor del vehículo según la tabla de la DGII) y {formatPrice(REGISTRATION_PRINT_FEE, "DOP")} por la impresión de la matrícula. Según la Norma General 03-25, si el
          traspaso no se completa en 90 días la DGII rechaza la renovación del marbete. Si el vendedor nunca traspasó a su nombre, se paga el traspaso doble.
        </>
      ),
    },
    {
      title: "Ten en cuenta el marbete",
      body: `Se renueva cada año. En el período ${MARBETE.period} costó ${formatPrice(MARBETE.newer, "DOP")} para vehículos de ${MARBETE.newerFromYear} en adelante y ${formatPrice(MARBETE.older, "DOP")} para los anteriores. Puedes comprobar que un marbete es auténtico escaneando su código QR.`,
    },
    {
      title: "Paga de forma segura",
      body: "Prefiere la transferencia bancaria o el cheque de administración al efectivo, y paga contra la entrega del vehículo y los documentos firmados. No envíes depósitos de reserva por un vehículo que no has visto.",
    },
  ];

  return (
    <>
      <PageHeader title="Guía de compra segura" description="Los pasos para comprar un vehículo usado en República Dominicana sin sorpresas legales." width="6xl" large />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
              <span className="display grid size-10 shrink-0 place-items-center rounded-full bg-brand text-lg text-brand-ink">{i + 1}</span>
              <div>
                <h2 className="wide font-bold">{s.title}</h2>
                <p className="mt-1.5 leading-relaxed text-ink/85">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <section className="mt-10 text-sm text-muted">
          <h2 className="font-semibold text-ink">Fuentes</h2>
          <p className="mt-1">Información de referencia; las tarifas y los requisitos pueden cambiar. Confírmalos en la DGII antes de hacer el trámite.</p>
          <ul className="mt-2 space-y-1">
            {SOURCES.map(([label, href]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                  {label} <ExternalLink className="size-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
