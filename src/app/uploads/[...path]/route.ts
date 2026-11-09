import { readUpload } from "@/lib/upload";

export async function GET(_: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const segments = (await ctx.params).path;
  const file = await readUpload(segments);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": segments[1].endsWith(".jpg") ? "image/jpeg" : "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
