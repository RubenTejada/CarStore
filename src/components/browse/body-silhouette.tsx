import type { BodyType } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

/**
 * Siluetas laterales por tipo de carrocería (viewBox 120x48, frente a la derecha).
 * `top` traza el perfil desde la base trasera hasta la base delantera (y = SILL);
 * la línea inferior con los pasos de rueda se genera a partir de `wheels`.
 * Las ruedas llevan la clase `wheel` para animarlas (girar) desde el padre.
 */
const SILL = 38;
const TIRE = 8.5;

type Shape = { top: string; glass: string; wheels: [number, number]; arch: number; extra?: string };

const SHAPES: Record<BodyType, Shape> = {
  SEDAN: {
    top: "M5 38L5 30Q5 26 9 25L30 23C38 14 44 12 54 12L70 12C78 12 84 16 90 22L106 25Q115 27 115 32L115 38",
    glass: "M34 23.5C40.5 16.5 45 14.5 54 14.5L60 14.5L60 23.5ZM63 14.5L70 14.5C76 14.5 81 17.5 86 23.5L63 23.5Z",
    wheels: [26, 92],
    arch: 10.5,
  },
  HATCHBACK: {
    top: "M11 38L11 28Q11 24 15 22L22 13Q24 11 28 11L66 11C74 11 80 15 86 21L100 24Q109 26 109 32L109 38",
    glass: "M18.5 21.5L24.5 14.5Q25.5 13.5 28 13.5L46 13.5L46 21.5ZM49 13.5L65 13.5C71 13.5 76 16.5 81 21.5L49 21.5Z",
    wheels: [28, 90],
    arch: 10.5,
  },
  JEEPETA: {
    top: "M5 38L5 20Q5 16 9 15L14 9Q15.5 7 19 7L74 7C80 7 84 9 88 13L94 19L108 21Q115 22.5 115 28L115 38",
    glass: "M11 18L16 11Q17 10 19 10L36 10L36 18ZM39 10L58 10L58 18L39 18ZM61 10L73 10C78 10 81.5 11.5 85 15L88 18L61 18Z",
    wheels: [26, 94],
    arch: 11,
  },
  PICKUP: {
    top: "M4 38L4 22L50 22L50 12Q50 8 54 8L72 8C77 8 80 10 83 13L90 20L106 22Q115 23.5 115 29L115 38",
    glass: "M53 11L66 11L66 19L53 19ZM69 11L72 11C76 11 78.5 12.5 81 15L85 19L69 19Z",
    wheels: [24, 95],
    arch: 11,
  },
  COUPE: {
    top: "M5 38L5 30Q5 26 10 25L28 23C40 15 50 13 60 13C72 13 80 16 88 22L106 25Q115 27 115 33L115 38",
    glass: "M36 22.5C45 17 52 15.5 60 15.5L62 15.5L62 22.5ZM65 15.5C72 15.5 78 17.5 84 22.5L65 22.5Z",
    wheels: [27, 93],
    arch: 10.5,
  },
  CONVERTIBLE: {
    top: "M5 38L5 29Q5 25 10 24.5L76 24L70.5 16.8Q70.8 15.6 72.6 15.9L80.5 24L106 25Q115 27 115 33L115 38",
    glass: "",
    wheels: [27, 93],
    arch: 10.5,
    // Apoyacabezas de los asientos.
    extra: "M41 24.5L41 19.5Q41 18 42.5 18L46 18Q47.5 18 47.5 19.5L47.5 24.5ZM55 24.5L55 19.5Q55 18 56.5 18L60 18Q61.5 18 61.5 19.5L61.5 24.5Z",
  },
  MINIVAN: {
    top: "M5 38L5 14Q5 9 10 8.5L76 8C82 8 86 10 90 14L98 21L108 23Q115 24.5 115 30L115 38",
    glass: "M8 12Q8 11 10 11L28 11L28 19L8 19ZM31 11L52 11L52 19L31 19ZM55 11L75 11C80 11 83 12.5 86 15.5L89 19L55 19Z",
    wheels: [25, 92],
    arch: 11,
  },
  VAN: {
    top: "M4 38L4 7Q4 4 7 4L92 4Q97 4 99 8L106 19Q115 21 115 27L115 38",
    glass: "M38 7L58 7L58 18L38 18ZM62 7L82 7L82 18L62 18ZM86 7L95 7Q96.5 7 97.5 9L103 18L86 18Z",
    wheels: [24, 94],
    arch: 11,
  },
};

/** Perfil completo: contorno superior + línea inferior con pasos de rueda. */
function bodyPath(s: Shape) {
  const [rear, front] = s.wheels;
  const r = s.arch;
  return `${s.top}L${front + r} ${SILL}A${r} ${r} 0 0 0 ${front - r} ${SILL}L${rear + r} ${SILL}A${r} ${r} 0 0 0 ${rear - r} ${SILL}Z`;
}

export function BodySilhouette({ type, className }: { type: BodyType; className?: string }) {
  const s = SHAPES[type];
  return (
    <svg viewBox="0 0 120 48" className={cn("overflow-visible", className)} aria-hidden>
      <path d={bodyPath(s)} fill="currentColor" />
      {s.extra && <path d={s.extra} fill="currentColor" />}
      {s.glass && <path d={s.glass} fill="var(--glass, rgba(255,255,255,0.55))" />}
      {s.wheels.map((cx) => (
        <g key={cx} className="wheel" style={{ transformOrigin: `${cx}px ${SILL}px`, transformBox: "view-box" }}>
          <circle cx={cx} cy={SILL} r={TIRE} fill="var(--tire, #0e1b33)" />
          <circle cx={cx} cy={SILL} r={4.6} fill="var(--rim, #c9d1de)" />
          <path d={`M${cx} ${SILL - 4.6}v9.2M${cx - 4.6} ${SILL}h9.2`} stroke="var(--tire, #0e1b33)" strokeWidth={1.2} />
          <circle cx={cx} cy={SILL} r={1.4} fill="var(--tire, #0e1b33)" />
        </g>
      ))}
    </svg>
  );
}
