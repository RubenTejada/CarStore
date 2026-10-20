"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORTS } from "@/lib/search-params";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only sm:not-sr-only sm:text-muted">Ordenar</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "recientes") next.delete("orden");
          else next.set("orden", e.target.value);
          next.delete("pagina");
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
        className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-semibold"
      >
        {Object.entries(SORTS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
