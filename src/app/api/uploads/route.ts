import { getCurrentUser } from "@/lib/auth";
import { saveImage } from "@/lib/upload";

// Sube una imagen (vehículo, logo o portada). Solo usuarios con sesión.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Inicia sesión para subir fotos." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File)) return Response.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
  try {
    const url = await saveImage(file, kind === "logo" || kind === "cover" ? kind : "vehicle");
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "No se pudo procesar la imagen." }, { status: 400 });
  }
}
