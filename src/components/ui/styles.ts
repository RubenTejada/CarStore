// Clases compartidas para botones y campos (Tailwind).
export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
  size: { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base" },
  primary: "bg-accent text-accent-ink hover:brightness-110",
  brand: "bg-brand text-brand-ink hover:brightness-110",
  outline: "border border-line bg-surface text-ink hover:border-ink",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-transparent text-accent border border-accent/40 hover:bg-accent hover:text-accent-ink",
};

export const button = (variant: "primary" | "brand" | "outline" | "ghost" | "danger" = "primary", size: "sm" | "md" | "lg" = "md") =>
  `${btn.base} ${btn.size[size]} ${btn[variant]}`;

export const input =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export const label = "mb-1.5 block text-sm font-medium text-ink";

export const card = "rounded-xl border border-line bg-surface";
