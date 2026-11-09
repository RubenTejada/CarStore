import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGAL_VERSION } from "@/lib/legal";

const mocks = vi.hoisted(() => {
  const db = {
    plan: { findUnique: vi.fn() },
    subscription: { count: vi.fn(), create: vi.fn() },
    legalAcceptance: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db };
});
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "seller", dealerId: null, email: "seller@example.com" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/exchange-rate", () => ({ getUsdRate: async () => ({ rate: 60.5, publishedOn: null }) }));

import { requestPlan } from "./plans";

const offer = { id: "plan", name: "Plan Pro", priceDop: 1000, maxActiveListings: 10, featuredSlots: 1, durationDays: 30, officialSite: false, socialModule: false };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries({ planOffer: JSON.stringify(offer), accepted: "on", legalVersion: LEGAL_VERSION, ...values }).forEach(([k, v]) => data.set(k, v));
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({ LEGAL_OPERATOR_NAME: "Operador", LEGAL_OPERATOR_RNC: "TEST", LEGAL_OPERATOR_ADDRESS: "Dirección", LEGAL_CONTACT_EMAIL: "legal@example.com" }))
    vi.stubEnv(key, value);
  mocks.db.$transaction.mockImplementation(async (work) => work(mocks.db));
  mocks.db.plan.findUnique.mockResolvedValue({ ...offer, active: true, forDealers: false });
  mocks.db.subscription.count.mockResolvedValue(0);
  mocks.db.subscription.create.mockResolvedValue({ id: "sub1" });
});

describe("requestPlan with a Payoneer payment link", () => {
  it("stores the USD amount to request without asking for a transfer reference", async () => {
    expect(await requestPlan(undefined, form({ method: "PAYONEER_LINK" }))).toMatchObject({ ok: expect.stringContaining("US$16.53") });
    expect(mocks.db.subscription.create).toHaveBeenCalledWith({ data: { planId: "plan", userId: "seller", dealerId: null, paymentMethod: "PAYONEER_LINK", paymentRef: null, chargeUsdCents: 1653 } });
    expect(mocks.db.legalAcceptance.create).toHaveBeenCalledWith({ data: expect.objectContaining({ subjectId: "sub1", details: expect.objectContaining({ priceDop: 1000, payment: { method: "PAYONEER_LINK", chargeUsdCents: 1653, usdDop: 60.5 } }) }) });
  });

  it("ignores a reference sent with a card request", async () => {
    await requestPlan(undefined, form({ method: "PAYONEER_LINK", paymentRef: "abc123" }));
    expect(mocks.db.subscription.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentRef: null }) });
  });

  it("still requires the reference for transfers and stores no USD amount", async () => {
    expect(await requestPlan(undefined, form({ method: "TRANSFER" }))).toMatchObject({ error: expect.stringContaining("referencia") });
    expect(await requestPlan(undefined, form({ method: "TRANSFER", paymentRef: "ref123" }))).toHaveProperty("ok");
    expect(mocks.db.subscription.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentMethod: "TRANSFER", paymentRef: "ref123", chargeUsdCents: null }) });
  });

  it("rejects unknown payment methods", async () => {
    expect(await requestPlan(undefined, form({ method: "CASH" }))).toHaveProperty("error");
    expect(mocks.db.subscription.create).not.toHaveBeenCalled();
  });
});
