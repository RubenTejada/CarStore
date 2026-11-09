import { cn } from "@/lib/cn";
import { LOOK } from "./look";

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Controles a la derecha del título (orden, vista, filtro). */
  actions?: React.ReactNode;
  /** Contenido bajo el título dentro de la franja (p. ej. el buscador). */
  children?: React.ReactNode;
  /** Ancho del contenido de la página, para alinear el título con él. */
  width?: "6xl" | "7xl";
  /** Título más grande, para las páginas informativas. */
  large?: boolean;
};

/** Encabezado de las páginas interiores. El contenido de la página va después, en su propio contenedor. */
export function PageHeader({ title, description, actions, children, width = "7xl", large = false }: Props) {
  const band = LOOK === "banda";
  return (
    <header className={cn(band && "relative bg-night text-white")}>
      <div className={cn("relative mx-auto px-4 sm:px-6", width === "6xl" ? "max-w-6xl" : "max-w-7xl", band ? "py-10" : "pt-10")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className={cn("display", large ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl")}>{title}</h1>
            {description && (
              <p className={cn("max-w-2xl", large ? "mt-3 text-lg" : "mt-1", band ? "text-white/70" : "text-muted")} aria-live="polite">
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </header>
  );
}
