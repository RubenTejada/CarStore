"use client";

import { useId } from "react";
import Link from "next/link";
import { LEGAL_VERSION } from "@/lib/legal";

export function LegalAcceptance({ children }: { children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <input type="hidden" name="legalVersion" value={LEGAL_VERSION} />
      <div className="flex items-start gap-3">
        <input id={id} type="checkbox" name="accepted" required className="mt-1 size-4 shrink-0 accent-[var(--brand)]" />
        <label htmlFor={id}>{children}</label>
      </div>
    </div>
  );
}

export function LegalLink({ doc, children }: { doc: string; children: React.ReactNode }) {
  return <Link href={`/legal/${doc}`} target="_blank" rel="noopener" className="font-medium text-brand underline">{children}</Link>;
}
