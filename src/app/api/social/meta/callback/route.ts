import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import { sealSecret } from "@/lib/social/crypto";
import { META_STATE_COOKIE, exchangeCode, listPages } from "@/lib/social/meta";
import { connectedPage, socialEnabled } from "@/lib/social/service";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Meta vuelve aquí con `code` (o `error` si el dealer canceló). Con una sola página se conecta de una vez;
// con varias, se guardan cifradas y el dealer elige en /panel/redes.
export async function GET(request: Request) {
  const user = await requireUser("DEALER");
  const params = new URL(request.url).searchParams;
  const store = await cookies();
  const saved = store.get(META_STATE_COOKIE)?.value ?? "";
  store.delete({ name: META_STATE_COOKIE, path: "/api/social/meta" });
  const [state, userId] = saved.split(".");
  if (!state || userId !== user.id || !same(state, params.get("state") ?? "")) redirect("/panel/redes?error=estado");
  if (params.get("error") || !params.get("code")) redirect("/panel/redes?error=cancelado");
  if (!user.dealerId || !(await socialEnabled(user.dealerId))) redirect("/panel/redes?error=no-disponible");
  const dealerId = user.dealerId;

  let pages;
  try {
    pages = await listPages(await exchangeCode(params.get("code")!, siteUrl("/api/social/meta/callback")));
  } catch (error) {
    console.error("[redes] autorización de Meta", error);
    redirect("/panel/redes?error=meta");
  }
  if (!pages.length) redirect("/panel/redes?error=sin-paginas");

  const data = pages.length === 1 ? connectedPage(pages[0]) : { pendingPages: sealSecret(JSON.stringify(pages)) };
  await db.socialAccount.upsert({ where: { dealerId }, create: { dealerId, ...data }, update: data });
  redirect(pages.length === 1 ? "/panel/redes?ok=conectado" : "/panel/redes?elegir=1");
}
