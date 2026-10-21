import Image from "next/image";
import { cn } from "@/lib/cn";

/** Isotipo de la entidad sobre fondo blanco: los logos oficiales están pensados para fondo claro. */
export function LenderLogo({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-1", className)}>
      <Image src={src} alt="" width={32} height={32} className="size-full object-contain" />
    </span>
  );
}
