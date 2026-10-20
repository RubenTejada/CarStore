// Marca de TuCarroOnline: monograma "TC" en itálica sobre un bloque inclinado, con líneas de velocidad.
// Las líneas toman el color del texto (`currentColor`); el bloque usa el acento.
// Las clases `logo-line` / `logo-block` las anima globals.css (entrada y hover del logo).
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden>
      <path d="M10 14H30L28.4 21H8.4Z" fill="currentColor" className="logo-line" style={{ "--i": 0 } as React.CSSProperties} />
      <path d="M4 28.5H26L24.4 35.5H2.4Z" fill="currentColor" className="logo-line" style={{ "--i": 1 } as React.CSSProperties} />
      <path d="M10 43H24L22.4 50H8.4Z" fill="currentColor" className="logo-line" style={{ "--i": 2 } as React.CSSProperties} />
      <g className="logo-block">
        <path d="M40 4H98L86 60H28Z" className="fill-accent" />
        <g transform="matrix(1 0 -0.214 1 6.85 0)" fill="#FFFFFF">
          <path d="M37.5 16H61.5V23H53V48H46V23H37.5Z" />
          <path d="M88.5 15.5H74.5Q64 15.5 64 26V38Q64 48.5 74.5 48.5H88.5V41.5H74.5Q71 41.5 71 38V26Q71 22.5 74.5 22.5H88.5Z" />
        </g>
      </g>
    </svg>
  );
}
