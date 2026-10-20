import { readUpload } from "@/lib/upload";

export async function GET(_: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const file = await readUpload((await ctx.params).path);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
