import Image from "next/image";
import { cn } from "@/lib/cn";

/** Logo del dealer o, si no tiene, un monograma con sus iniciales. */
export function DealerBadge({ dealer, className }: { dealer: { name: string; logoUrl: string | null }; className?: string }) {
  if (dealer.logoUrl)
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-xl border border-line bg-white", className)}>
        <Image src={dealer.logoUrl} alt={`Logo de ${dealer.name}`} fill sizes="96px" className="object-contain p-1" />
      </span>
    );
  const initials = dealer.name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn("display grid shrink-0 place-items-center rounded-xl bg-brand text-brand-ink", className)}
      style={{ fontSize: "clamp(0.9rem, 40cqw, 1.6rem)", containerType: "inline-size" }}
    >
      {initials}
    </span>
  );
}
