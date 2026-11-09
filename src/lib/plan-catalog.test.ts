import { describe, expect, it } from "vitest";
import { planSync, type CurrentPlan, type PlanSpec } from "./plan-catalog";

const spec = (name: string, priceDop: number, extra: Partial<PlanSpec> = {}): PlanSpec => ({
  name, description: `${name}.`, priceDop, maxActiveListings: 10, featuredSlots: 1, durationDays: 30, forDealers: true, officialSite: false, socialModule: false, ...extra,
});
const current = (s: PlanSpec, openSubscriptions = 0): CurrentPlan => ({ ...s, id: `id-${s.name}`, openSubscriptions });

describe("planSync", () => {
  const catalog = [spec("Estándar", 3_500), spec("Plus", 5_500), spec("Oficial", 10_000, { officialSite: true })];

  it("keeps matching plans and creates the missing ones", () => {
    expect(planSync([current(catalog[0]), current(catalog[1])], catalog).map((s) => s.kind)).toEqual(["keep", "keep", "create"]);
  });

  it("edits a plan without open contracts and replaces one that has them", () => {
    const steps = planSync([current(spec("Estándar", 15_000)), current(spec("Plus", 25_000), 2), current(catalog[2])], catalog);
    expect(steps.map((s) => s.kind)).toEqual(["update", "replace", "keep"]);
  });

  it("only rewrites the description when the terms are the same, even with contracts", () => {
    const [step] = planSync([current({ ...catalog[0], description: "Vieja." }, 3)], catalog.slice(0, 1));
    expect(step.kind).toBe("update");
  });

  it("stops offering active plans that are not in the catalog", () => {
    const steps = planSync([current(catalog[0]), current(spec("Viejo", 9_000), 1)], catalog.slice(0, 1));
    expect(steps.map((s) => [s.kind, "current" in s ? s.current.name : s.spec.name])).toEqual([["keep", "Estándar"], ["deactivate", "Viejo"]]);
  });
});
