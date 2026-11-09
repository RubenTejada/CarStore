import { z } from "zod";

const fields = z.object({
  id: z.string().min(1), name: z.string().min(1), priceDop: z.number().int().min(0),
  maxActiveListings: z.number().int().min(1), featuredSlots: z.number().int().min(0), durationDays: z.number().int().min(1), officialSite: z.boolean(), socialModule: z.boolean(),
});
export type PlanOffer = z.infer<typeof fields>;
export const planOfferSchema = z.preprocess((raw) => {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  try { return JSON.parse(raw); } catch { return null; }
}, fields);

export function samePlanOffer(a: PlanOffer, b: PlanOffer) {
  return a.id === b.id && a.name === b.name && a.priceDop === b.priceDop && a.maxActiveListings === b.maxActiveListings && a.featuredSlots === b.featuredSlots && a.durationDays === b.durationDays && a.officialSite === b.officialSite && a.socialModule === b.socialModule;
}
