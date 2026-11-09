import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FORMATS, type FormatId } from "@/lib/social/design";
import { cn } from "@/lib/cn";

export type PostRow = {
  id: string;
  network: "FACEBOOK" | "INSTAGRAM";
  status: "PENDING" | "PUBLISHED" | "FAILED";
  format: string;
  story: boolean;
  imageUrl: string;
  permalink: string | null;
  error: string | null;
  createdAt: Date;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  vehicle?: { id: string; title: string };
};

const STATUS = { PENDING: ["Publicando", "bg-sun/20"], PUBLISHED: ["Publicado", "bg-ok/15 text-ok"], FAILED: ["Falló", "bg-accent/15 text-accent"] } as const;
const n = (v: number) => v.toLocaleString("es-DO");

/** Historial de publicaciones con sus métricas. */
export function PostsTable({ posts, showVehicle = true }: { posts: PostRow[]; showVehicle?: boolean }) {
  if (!posts.length) return <p className="p-5 text-sm text-muted">Aún no hay publicaciones en redes.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th scope="col" className="px-5 py-2.5 font-medium">Publicación</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Alcance</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Vistas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Reacciones</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Comentarios</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Compartidos</th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">Guardados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {posts.map((p) => {
            const [statusLabel, statusClass] = STATUS[p.status];
            return (
              <tr key={p.id} className="align-top">
                <td className="px-5 py-3">
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada del anuncio */}
                    <img src={p.imageUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {p.network === "FACEBOOK" ? "Facebook" : "Instagram"}
                        <span className="font-normal text-muted"> · {p.story ? "Historia" : (FORMATS[p.format as FormatId]?.label ?? p.format)}</span>
                      </p>
                      {showVehicle && p.vehicle && (
                        <Link href={`/panel/vehiculos/${p.vehicle.id}/redes`} className="block truncate hover:underline">
                          {p.vehicle.title}
                        </Link>
                      )}
                      <p className="text-xs text-muted">{p.createdAt.toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" })}</p>
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                          Ver publicación <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", statusClass)}>{statusLabel}</span>
                  {p.error && <p className="mt-1 max-w-56 text-xs text-muted">{p.error}</p>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{n(p.reach)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{n(p.views)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{n(p.likes)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{n(p.comments)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{n(p.shares)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{n(p.saves)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
