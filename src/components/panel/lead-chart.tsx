/** Barras de contactos (u otra cuenta, `unit`) por día: cada barra muestra su fecha y total al pasar el cursor o con lector de pantalla. */
export function LeadChart({ days, unit = ["contacto", "contactos"] }: { days: { day: string; count: number }[]; unit?: [string, string] }) {
  const peak = Math.max(1, ...days.map((d) => d.count));
  const label = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("es-DO", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <figure>
      <div className="flex h-28 items-end gap-0.5 border-b border-line" aria-hidden>
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${label(d.day)}: ${d.count} ${d.count === 1 ? unit[0] : unit[1]}`}>
            <div className="w-full rounded-t bg-brand transition-opacity group-hover:opacity-75" style={{ height: d.count ? `${Math.max(4, (d.count / peak) * 100)}%` : 0 }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{label(days[0].day)}</span>
        <span>Máx. {peak} al día</span>
        <span>Hoy</span>
      </figcaption>
      <table className="sr-only">
        <caption>{unit[1][0].toUpperCase() + unit[1].slice(1)} por día</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{label(d.day)}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
