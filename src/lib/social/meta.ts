// Sin dependencias de Next: también lo usa scripts/social-metrics.ts.
import { createHmac } from "node:crypto";
import { hasTokenKey } from "./crypto";

// Cliente mínimo de la Graph API de Meta: conectar la página de Facebook del dealer (y su cuenta
// profesional de Instagram vinculada), publicar fotos y leer sus métricas.
// Requiere una app de Meta (META_APP_ID, META_APP_SECRET) con «Inicio de sesión con Facebook para empresas»
// y los permisos de META_SCOPES aprobados en la revisión de la app.

const GRAPH_VERSION = "v24.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "read_insights",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
];

/** Cookie con el `state` de la autorización en curso (y el usuario que la inició). */
export const META_STATE_COOKIE = "cs_meta_state";

export const isMetaConfigured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET) && hasTokenKey();

export class MetaError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
  /** El token venció o el dealer quitó el permiso: hay que volver a conectar. */
  get expired() {
    return this.code === 190 || this.code === 102;
  }
}

const proof = (token: string) => createHmac("sha256", process.env.META_APP_SECRET ?? "").update(token).digest("hex");

async function graph<T>(pathname: string, { token, params = {}, method = "GET" }: { token?: string; params?: Record<string, string>; method?: "GET" | "POST" }): Promise<T> {
  const all = new URLSearchParams(params);
  if (token) {
    all.set("access_token", token);
    all.set("appsecret_proof", proof(token));
  }
  const url = `${GRAPH}${pathname}`;
  const res = await fetch(method === "GET" ? `${url}?${all}` : url, {
    method,
    ...(method === "POST" && { body: all, headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number; error_user_msg?: string } };
  if (!res.ok || body.error) throw new MetaError(body.error?.error_user_msg || body.error?.message || `Meta respondió ${res.status}`, body.error?.code);
  return body;
}

export function authorizeUrl(state: string, redirectUri: string) {
  const params = new URLSearchParams({ client_id: process.env.META_APP_ID ?? "", redirect_uri: redirectUri, state, response_type: "code", scope: META_SCOPES.join(",") });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

/** Cambia el código de la autorización por un token de usuario de larga duración. */
export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const app = { client_id: process.env.META_APP_ID ?? "", client_secret: process.env.META_APP_SECRET ?? "" };
  const short = await graph<{ access_token: string }>("/oauth/access_token", { params: { ...app, redirect_uri: redirectUri, code } });
  const long = await graph<{ access_token: string }>("/oauth/access_token", { params: { ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token } });
  return long.access_token;
}

export type MetaPage = { id: string; name: string; token: string; igId: string | null; igUsername: string | null };

/** Páginas que administra el usuario. Con un token de usuario de larga duración, los de página no vencen. */
export async function listPages(userToken: string): Promise<MetaPage[]> {
  type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };
  const res = await graph<{ data: Page[] }>("/me/accounts", { token: userToken, params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100" } });
  return res.data.map((p) => ({ id: p.id, name: p.name, token: p.access_token, igId: p.instagram_business_account?.id ?? null, igUsername: p.instagram_business_account?.username ?? null }));
}

export type Published = { id: string; permalink: string | null };

export async function publishFacebookPhoto(pageId: string, token: string, imageUrl: string, caption: string): Promise<Published> {
  const res = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, { token, method: "POST", params: { url: imageUrl, message: caption, published: "true" } });
  const id = res.post_id ?? res.id;
  const post = await graph<{ permalink_url?: string }>(`/${id}`, { token, params: { fields: "permalink_url" } }).catch(() => null);
  return { id, permalink: post?.permalink_url ?? null };
}

export async function publishInstagram(igId: string, token: string, imageUrl: string, caption: string, story: boolean): Promise<Published> {
  const container = await graph<{ id: string }>(`/${igId}/media`, {
    token,
    method: "POST",
    params: story ? { image_url: imageUrl, media_type: "STORIES" } : { image_url: imageUrl, caption },
  });
  // Instagram descarga y procesa la imagen antes de poder publicarla.
  for (let i = 0; i < 10; i++) {
    const { status_code } = await graph<{ status_code?: string }>(`/${container.id}`, { token, params: { fields: "status_code" } });
    if (status_code === "FINISHED" || !status_code) break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new MetaError("Instagram no pudo procesar la imagen.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  const media = await graph<{ id: string }>(`/${igId}/media_publish`, { token, method: "POST", params: { creation_id: container.id } });
  const info = await graph<{ permalink?: string }>(`/${media.id}`, { token, params: { fields: "permalink" } }).catch(() => null);
  return { id: media.id, permalink: info?.permalink ?? null };
}

export type Metrics = { reach: number; views: number; likes: number; comments: number; shares: number; saves: number; clicks: number };

type Insight = { data?: { values?: { value?: number }[]; total_value?: { value?: number } }[] };
const insightValue = (r: Insight) => r.data?.[0]?.values?.[0]?.value ?? r.data?.[0]?.total_value?.value;

/**
 * Primera métrica disponible de cada lista. Meta retira y renombra métricas con frecuencia, y una sola
 * métrica inválida hace fallar toda la consulta: se piden por separado y se ignoran las que no existen.
 */
async function insights(id: string, token: string, wanted: Record<string, string[]>) {
  const out: Record<string, number> = {};
  await Promise.all(
    Object.entries(wanted).map(async ([field, names]) => {
      for (const metric of names) {
        const value = await graph<Insight>(`/${id}/insights`, { token, params: { metric } }).then(insightValue, () => undefined);
        if (typeof value === "number") {
          out[field] = value;
          return;
        }
      }
    }),
  );
  return out;
}

export async function facebookMetrics(postId: string, token: string): Promise<Metrics & { permalink: string | null }> {
  type Post = { permalink_url?: string; shares?: { count?: number }; reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } } };
  const [post, ins] = await Promise.all([
    graph<Post>(`/${postId}`, { token, params: { fields: "permalink_url,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)" } }),
    insights(postId, token, { reach: ["post_total_media_view_unique", "post_impressions_unique"], views: ["post_media_view", "post_impressions"], clicks: ["post_clicks"] }),
  ]);
  return {
    permalink: post.permalink_url ?? null,
    reach: ins.reach ?? 0,
    views: ins.views ?? 0,
    clicks: ins.clicks ?? 0,
    likes: post.reactions?.summary?.total_count ?? 0,
    comments: post.comments?.summary?.total_count ?? 0,
    shares: post.shares?.count ?? 0,
    saves: 0,
  };
}

export async function instagramMetrics(mediaId: string, token: string): Promise<Metrics & { permalink: string | null }> {
  const [media, ins] = await Promise.all([
    graph<{ like_count?: number; comments_count?: number; permalink?: string }>(`/${mediaId}`, { token, params: { fields: "like_count,comments_count,permalink" } }),
    insights(mediaId, token, { reach: ["reach"], views: ["views", "impressions"], shares: ["shares"], saves: ["saved"], clicks: ["profile_visits", "navigation"] }),
  ]);
  return {
    permalink: media.permalink ?? null,
    reach: ins.reach ?? 0,
    views: ins.views ?? 0,
    likes: media.like_count ?? 0,
    comments: media.comments_count ?? 0,
    shares: ins.shares ?? 0,
    saves: ins.saves ?? 0,
    clicks: ins.clicks ?? 0,
  };
}
