import Link from "next/link";
import { BarChart3, Megaphone, Palette, Send } from "lucide-react";
import { button, card } from "@/components/ui/styles";

/** Lo que ve un dealer cuyo plan no incluye el módulo de redes sociales. */
export function SocialUpsell() {
  const perks = [
    { icon: <Send className="size-5 text-brand" aria-hidden />, title: "Publicación automática", text: "Cada carro que publiques en el portal sale en tu página de Facebook y tu Instagram." },
    { icon: <Palette className="size-5 text-brand" aria-hidden />, title: "Editor de anuncios", text: "Plantillas, fotos, tipografías y colores para que cada publicación luzca profesional." },
    { icon: <BarChart3 className="size-5 text-brand" aria-hidden />, title: "Métricas en un solo lugar", text: "Alcance e interacciones en redes junto a las visitas y contactos del portal." },
  ];
  return (
    <div className={`${card} max-w-3xl p-6 sm:p-8`}>
      <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
        <Megaphone className="size-4" aria-hidden /> Módulo de redes sociales
      </p>
      <h2 className="display mt-4 text-2xl">Vende también en Facebook e Instagram</h2>
      <ul className="mt-6 space-y-4">
        {perks.map((p) => (
          <li key={p.title} className="flex gap-3">
            {p.icon}
            <span>
              <span className="block font-semibold">{p.title}</span>
              <span className="text-sm text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href="/panel/planes" className={`${button("primary")} mt-8`}>
        Ver planes con redes sociales
      </Link>
    </div>
  );
}
