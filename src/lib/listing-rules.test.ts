import { describe, expect, it } from "vitest";
import { canEditVehicle, evaluatePublish, type Quota } from "./listing-rules";

const dealerA = { id: "u1", role: "DEALER" as const, dealerId: "dA" };
const dealerAColleague = { id: "u2", role: "DEALER" as const, dealerId: "dA" };
const dealerB = { id: "u3", role: "DEALER" as const, dealerId: "dB" };
const seller = { id: "u4", role: "SELLER" as const, dealerId: null };
const admin = { id: "u5", role: "ADMIN" as const, dealerId: null };

describe("canEditVehicle", () => {
  const dealerVehicle = { ownerId: "u1", dealerId: "dA" };
  const sellerVehicle = { ownerId: "u4", dealerId: null };

  it("lets users of the same dealer edit its vehicles", () => {
    expect(canEditVehicle(dealerA, dealerVehicle)).toBe(true);
    expect(canEditVehicle(dealerAColleague, dealerVehicle)).toBe(true);
  });

  it("blocks other dealers and sellers", () => {
    expect(canEditVehicle(dealerB, dealerVehicle)).toBe(false);
    expect(canEditVehicle(seller, dealerVehicle)).toBe(false);
    expect(canEditVehicle(dealerA, sellerVehicle)).toBe(false);
  });

  it("lets sellers edit only their own vehicles", () => {
    expect(canEditVehicle(seller, sellerVehicle)).toBe(true);
    expect(canEditVehicle({ ...seller, id: "other" }, sellerVehicle)).toBe(false);
  });

  it("lets admins edit everything", () => {
    expect(canEditVehicle(admin, dealerVehicle)).toBe(true);
  });
});

describe("evaluatePublish", () => {
  const quota: Quota = { planName: "Pro", endsAt: new Date(), maxActive: 2, usedActive: 1, featuredSlots: 1, usedFeatured: 0, dealerStatus: null };
  const change = { activate: true, featured: false, wasActive: false, wasFeatured: false };

  it("allows publishing within quota", () => {
    expect(evaluatePublish(quota, change)).toBeNull();
  });

  it("lets the free plan publish within its quota without featured slots", () => {
    const free: Quota = { ...quota, planName: "Gratis", endsAt: null, maxActive: 5, usedActive: 4, featuredSlots: 0 };
    expect(evaluatePublish(free, change)).toBeNull();
    expect(evaluatePublish({ ...free, usedActive: 5 }, change)).toMatch(/Gratis permite 5 vehículos/);
    expect(evaluatePublish(free, { ...change, featured: true })).toMatch(/no incluye/);
  });

  it("blocks publishing beyond the quota unless already active", () => {
    const full = { ...quota, usedActive: 2 };
    expect(evaluatePublish(full, change)).toMatch(/2 vehículos/);
    expect(evaluatePublish(full, { ...change, wasActive: true })).toBeNull();
  });

  it("blocks unapproved dealers", () => {
    expect(evaluatePublish({ ...quota, dealerStatus: "PENDING" }, change)).toMatch(/aprobado/);
  });

  it("limits featured slots", () => {
    expect(evaluatePublish(quota, { ...change, featured: true })).toBeNull();
    expect(evaluatePublish({ ...quota, usedFeatured: 1 }, { ...change, featured: true })).toMatch(/1 destacados/);
    expect(evaluatePublish({ ...quota, featuredSlots: 0 }, { ...change, featured: true })).toMatch(/no incluye/);
    expect(evaluatePublish(quota, { ...change, activate: false, featured: true })).toMatch(/publicado/);
  });

  it("allows saving drafts beyond the quota", () => {
    expect(evaluatePublish({ ...quota, usedActive: 2 }, { ...change, activate: false })).toBeNull();
  });
});
