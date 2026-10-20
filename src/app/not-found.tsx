import Link from "next/link";
import { BodySilhouette } from "@/components/browse/body-silhouette";
import { button } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <BodySilhouette type="SEDAN" className="mx-auto h-16 w-44 text-ink/20 [--glass:var(--bg)] [--rim:var(--bg)] [--tire:var(--ink)]" />
        <h1 className="display mt-6 text-4xl">Esta página no existe</h1>
        <p className="mt-3 text-muted">El vehículo pudo venderse o el enlace está incompleto.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/vehiculos" className={button("primary")}>
            Buscar vehículos
          </Link>
          <Link href="/" className={button("outline")}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
