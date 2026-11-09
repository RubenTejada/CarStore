import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import { META_STATE_COOKIE, authorizeUrl, isMetaConfigured } from "@/lib/social/meta";
import { socialEnabled } from "@/lib/social/service";

// Inicia la autorización con Facebook; Meta vuelve a /api/social/meta/callback.
export async function GET() {
  const user = await requireUser("DEALER");
  if (!user.dealerId || !isMetaConfigured() || !(await socialEnabled(user.dealerId))) redirect("/panel/redes?error=no-disponible");
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(META_STATE_COOKIE, `${state}.${user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/social/meta",
    maxAge: 600,
  });
  redirect(authorizeUrl(state, siteUrl("/api/social/meta/callback")));
}
