import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Heart, MousePointerClick, Radio, Send, TriangleAlert, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LEAD_DAYS, dailyCounts, leadWindowStart } from "@/lib/leads";
import { vehicleTitle } from "@/lib/urls";
import { openSecret } from "@/lib/social/crypto";
import { isMetaConfigured, type MetaPage } from "@/lib/social/meta";
import { socialEnabled } from "@/lib/social/service";
import { DEFAULT_DESIGN, parseDesign } from "@/lib/social/design";
import { TEMPLATES } from "@/lib/social/templates";
import { PageTitle } from "@/components/panel/shell";
import { LeadChart } from "@/components/panel/lead-chart";
import { PostsTable } from "@/components/social/posts-table";
import { SocialUpsell } from "@/components/social/upsell";
import { SocialSettingsForm } from "@/components/social/settings-form";
import { DisconnectButton, RefreshMetricsButton, SelectPageButton } from "@/components/social/connection-actions";
import { button, card } from "@/components/ui/styles";

export const metadata = { title: "Redes sociales" };

const ERRORS: Record<string, string> = {
  "no-disponible": "La conexión con Facebook no está disponible para tu cuenta.",
  estado: "La autorización no coincide con tu sesión. Intenta conectar de nuevo.",
  cancelado: "No se completó la autorización en Facebook.",
  meta: "Facebook no respondió como esperábamos. Intenta de nuevo en unos minutos.",
  "sin-paginas": "Tu cuenta de Facebook no administra ninguna página. Crea la página del dealer o pide acceso de administrador y vuelve a conectar.",
};

const n = (v: number) => v.toLocaleString("es-DO");

export default async function SocialPanel({ searchParams }: PageProps<"/panel/redes">) {
  const user = await requireUser("DEALER");
  if (!user.dealerId) redirect("/panel");
  const dealerId = user.dealerId;
  if (!(await socialEnabled(dealerId)))
    return (
      <>
        <PageTitle title="Redes sociales" />
        <SocialUpsell />
      </>
    );

  const sp = await searchParams;
  const since = leadWindowStart();
  const [account, posts, recentPosts, visits, views, leads] = await Promise.all([
    db.socialAccount.findUnique({ where: { dealerId } }),
    db.socialPost.findMany({ where: { dealerId, status: "PUBLISHED", publishedAt: { gte: since } }, select: { vehicleId: true, network: true, reach: true, views: true, likes: true, comments: true, shares: true, saves: true, clicks: true, metricsAt: true } }),
    db.socialPost.findMany({ where: { dealerId }, orderBy: { createdAt: "desc" }, take: 50, include: { vehicle: { select: { id: true, year: true, model: { select: { name: true, brand: { select: { name: true } } } } } } } }),
    db.socialVisit.findMany({ where: { vehicle: { dealerId }, createdAt: { gte: since } }, select: { network: true, createdAt: true, vehicleId: true } }),
    db.vehicle.aggregate({ where: { dealerId }, _sum: { views: true } }),
    db.leadEvent.findMany({ where: { vehicle: { dealerId }, createdAt: { gte: since } }, select: { vehicleId: true } }),
  ]);

  const pending = account?.pendingPages && !account.pageToken ? (JSON.parse(openSecret(account.pendingPages)) as MetaPage[]).map(({ id, name, igUsername }) => ({ id, name, igUsername })) : [];
  const connected = !!account?.pageToken;
  const design = parseDesign(account?.defaultDesign ?? null, DEFAULT_DESIGN);

  const interactions = (p: (typeof posts)[number]) => p.likes + p.comments + p.shares + p.saves;
  const byNetwork = (network: "FACEBOOK" | "INSTAGRAM") => {
    const list = posts.filter((p) => p.network === network);
    return {
      posts: list.length,
      reach: list.reduce((s, p) => s + p.reach, 0),
      views: list.reduce((s, p) => s + p.views, 0),
      interactions: list.reduce((s, p) => s + interactions(p), 0),
      visits: visits.filter((v) => v.network === network).length,
    };
  };
  const fb = byNetwork("FACEBOOK");
  const ig = byNetwork("INSTAGRAM");
  const lastSync = posts.reduce<Date | null>((d, p) => (p.metricsAt && (!d || p.metricsAt > d) ? p.metricsAt : d), null);

  // Rendimiento por vehículo: portal (visitas, contactos) junto a redes (alcance, interacciones, visitas que trajeron).
  const ids = [...new Set([...posts.map((p) => p.vehicleId), ...visits.map((v) => v.vehicleId)])];
  const vehicles = ids.length ? await db.vehicle.findMany({ where: { id: { in: ids } }, select: { id: true, year: true, views: true, model: { select: { name: true, brand: { select: { name: true } } } } } }) : [];
  const perVehicle = vehicles
    .map((v) => {
      const vp = posts.filter((p) => p.vehicleId === v.id);
      return {
        ...v,
        reach: vp.reduce((s, p) => s + p.reach, 0),
        interactions: vp.reduce((s, p) => s + interactions(p), 0),
        socialVisits: visits.filter((x) => x.vehicleId === v.id).length,
        leads: leads.filter((l) => l.vehicleId === v.id).length,
      };
    })
    .sort((a, b) => b.socialVisits + b.interactions - (a.socialVisits + a.interactions))
    .slice(0, 10);

  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <>
      <PageTitle
        title="Redes sociales"
        text="Publica tus vehículos en Facebook e Instagram y mide lo que pasa en las redes y en el portal."
        action={
          <Link href="/panel/redes/plantilla" className={button("primary")}>
            Editar diseño por defecto
          </Link>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}
      {sp.ok === "conectado" && <Notice>Página conectada. Los próximos vehículos que publiques saldrán en tus redes.</Notice>}
      {!isMetaConfigured() && <Notice tone="error">La conexión con Meta aún no está configurada en el portal. Mientras tanto puedes diseñar tus anuncios y descargar las imágenes.</Notice>}
      {account?.needsReconnect && <Notice tone="error">Meta pidió volver a autorizar tu página (el permiso venció o se retiró). Vuelve a conectar para seguir publicando.</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} p-5`} aria-labelledby="conn-title">
          <h2 id="conn-title" className="wide font-bold">
            Conexión
          </h2>
          {connected ? (
            <div className="mt-3 space-y-1.5 text-sm">
              <p>
                <span className="text-muted">Facebook:</span> <span className="font-semibold">{account.pageName}</span>
              </p>
              <p>
                <span className="text-muted">Instagram:</span>{" "}
                {account.igUsername ? <span className="font-semibold">@{account.igUsername}</span> : <span>sin cuenta profesional vinculada a la página</span>}
              </p>
              {account.connectedAt && <p className="text-muted">Conectada el {account.connectedAt.toLocaleDateString("es-DO", { dateStyle: "long" })}</p>}
              <div className="flex flex-wrap gap-2 pt-3">
                {isMetaConfigured() && (
                  <a href="/api/social/meta/connect" className={button("outline", "sm")}>
                    Volver a conectar
                  </a>
                )}
                <DisconnectButton />
              </div>
            </div>
          ) : pending.length ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Elige la página del dealer:</p>
              <ul className="mt-3 space-y-2">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
                    <span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="block text-muted">{p.igUsername ? `Instagram @${p.igUsername}` : "Sin Instagram vinculado"}</span>
                    </span>
                    <SelectPageButton pageId={p.id} name={p.name} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 text-sm">
              <p className="text-muted">Conecta la página de Facebook del dealer. Si tiene una cuenta profesional de Instagram vinculada, también se conecta.</p>
              {isMetaConfigured() && (
                <a href="/api/social/meta/connect" className={`${button("brand")} mt-4`}>
                  Conectar con Facebook
                </a>
              )}
              <p className="mt-4 text-xs text-muted">
                Facebook Marketplace no permite publicar desde otras aplicaciones: los anuncios salen en tu página y en Instagram, y desde ahí puedes compartirlos a Marketplace.
              </p>
            </div>
          )}
        </section>

        <section className={`${card} p-5`} aria-labelledby="pref-title">
          <h2 id="pref-title" className="wide mb-4 font-bold">
            Publicación
          </h2>
          <SocialSettingsForm autoPublish={account?.autoPublish ?? true} publishFacebook={account?.publishFacebook ?? true} publishInstagram={account?.publishInstagram ?? true} hasInstagram={!!account?.igUsername} />
          <p className="mt-4 text-sm text-muted">
            Diseño por defecto: <span className="font-semibold text-ink">{TEMPLATES[design.template].label}</span>. Ajusta el anuncio de un vehículo desde «Mis vehículos» → «Redes».
          </p>
        </section>
      </div>

      <section className={`${card} mt-8`} aria-labelledby="metrics-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 id="metrics-title" className="wide font-bold">
              Últimos {LEAD_DAYS} días
            </h2>
            <p className="text-sm text-muted">{lastSync ? `Métricas de Meta leídas: ${lastSync.toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" })}` : "Las métricas de Meta se leen unas horas después de publicar."}</p>
          </div>
          {connected && <RefreshMetricsButton />}
        </div>
        <div className="grid grid-cols-2 gap-px bg-line xl:grid-cols-4">
          <Kpi icon={<Send className="size-5 text-brand" aria-hidden />} label="Publicaciones" value={n(fb.posts + ig.posts)} hint={`${fb.posts} en Facebook, ${ig.posts} en Instagram`} />
          <Kpi icon={<Users className="size-5 text-brand" aria-hidden />} label="Alcance en redes" value={n(fb.reach + ig.reach)} hint="Personas que vieron tus publicaciones" />
          <Kpi icon={<Heart className="size-5 text-accent" aria-hidden />} label="Interacciones" value={n(fb.interactions + ig.interactions)} hint="Reacciones, comentarios, compartidos y guardados" />
          <Kpi icon={<MousePointerClick className="size-5 text-ok" aria-hidden />} label="Visitas desde redes" value={n(visits.length)} hint="Llegaron al portal por tus enlaces" />
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_20rem]">
          <div>
            <p className="mb-2 text-sm font-semibold">Visitas al portal desde redes por día</p>
            <LeadChart days={dailyCounts(visits.map((v) => v.createdAt))} unit={["visita", "visitas"]} />
          </div>
          <table className="text-sm">
            <caption className="sr-only">Comparación por red</caption>
            <thead className="text-left text-muted">
              <tr>
                <th scope="col" className="py-1.5 font-medium" />
                <th scope="col" className="py-1.5 text-right font-medium">Facebook</th>
                <th scope="col" className="py-1.5 text-right font-medium">Instagram</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {(
                [
                  ["Alcance", fb.reach, ig.reach],
                  ["Vistas", fb.views, ig.views],
                  ["Interacciones", fb.interactions, ig.interactions],
                  ["Visitas al portal", fb.visits, ig.visits],
                ] as const
              ).map(([l, a, b]) => (
                <tr key={l}>
                  <th scope="row" className="py-2 text-left font-normal">{l}</th>
                  <td className="py-2 text-right">{n(a)}</td>
                  <td className="py-2 text-right">{n(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-line px-5 py-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Eye className="size-4 text-muted" aria-hidden /> {n(views._sum.views ?? 0)} visitas totales en el portal
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="size-4 text-muted" aria-hidden /> {n(leads.length)} contactos en {LEAD_DAYS} días
          </span>
        </div>
      </section>

      {perVehicle.length > 0 && (
        <section className={`${card} mt-8`} aria-labelledby="veh-title">
          <h2 id="veh-title" className="wide border-b border-line p-5 font-bold">
            Rendimiento por vehículo
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Vehículo</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Alcance</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Interacciones</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Visitas desde redes</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Visitas totales</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Contactos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {perVehicle.map((v) => (
                  <tr key={v.id}>
                    <td className="px-5 py-3">
                      <Link href={`/panel/vehiculos/${v.id}/redes`} className="font-medium hover:underline">
                        {vehicleTitle(v)} {v.year}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right">{n(v.reach)}</td>
                    <td className="px-3 py-3 text-right">{n(v.interactions)}</td>
                    <td className="px-3 py-3 text-right">{n(v.socialVisits)}</td>
                    <td className="px-3 py-3 text-right">{n(v.views)}</td>
                    <td className="px-5 py-3 text-right">{n(v.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={`${card} mt-8`} aria-labelledby="posts-title">
        <h2 id="posts-title" className="wide border-b border-line p-5 font-bold">
          Publicaciones
        </h2>
        <PostsTable posts={recentPosts.map((p) => ({ ...p, vehicle: { id: p.vehicle.id, title: `${vehicleTitle(p.vehicle)} ${p.vehicle.year}` } }))} />
      </section>
    </>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <p className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-sun/60 bg-sun/15" : "border-ok/40 bg-ok/10"}`}>
      {tone === "error" && <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="flex items-center justify-between text-sm text-muted">
        {label}
        {icon}
      </p>
      <p className="wide mt-2 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
