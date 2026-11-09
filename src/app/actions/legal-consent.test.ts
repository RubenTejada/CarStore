import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGAL_VERSION } from "@/lib/legal";

const mocks = vi.hoisted(() => {
  const user = { id: "seller", dealerId: null, role: "SELLER", email: "seller@example.com", legalVersion: "2026-11-01" };
  const db = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    plan: { findUnique: vi.fn() }, subscription: { count: vi.fn(), create: vi.fn() },
    legalAcceptance: { create: vi.fn() }, legalRequest: { create: vi.fn() },
    vehicle: { findUnique: vi.fn() }, leadEvent: { create: vi.fn() }, contactRequest: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, user, requireUser: vi.fn(), createSession: vi.fn(), sendEmail: vi.fn() };
});
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser, getCurrentUser: vi.fn(), hashPassword: vi.fn().mockResolvedValue("hash"), createSession: mocks.createSession, homeFor: () => "/panel", safeNext: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/account-email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/claude", () => ({ isClaudeConfigured: () => true }));

import { register } from "./auth";
import { requestPlan } from "./plans";
import { requestContact } from "./contact";
import { importListing, startInventoryImport } from "./import";
import { saveVehicle } from "./vehicles";
import { submitLegalRequest } from "./legal";
import { savePlan } from "./admin";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};
const account = { kind: "comprador", name: "Comprador", email: "buyer@example.com", phone: "", password: "safe-test-password", accepted: "on", legalVersion: LEGAL_VERSION };
const offer = { id: "plan", name: "Plan Pro", priceDop: 1000, maxActiveListings: 10, featuredSlots: 1, durationDays: 30, officialSite: false, socialModule: false };

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.requireUser.mockResolvedValue(mocks.user);
  mocks.db.$transaction.mockImplementation(async (work) => typeof work === "function" ? work(mocks.db) : Promise.all(work));
});

describe("server-side legal authorization", () => {
  it("rejects account creation without affirmative consent or with stale terms", async () => {
    for (const overrides of [{ accepted: "" }, { legalVersion: "old-version" }]) {
      expect(await register(undefined, form({ ...account, ...overrides }))).toHaveProperty("error");
    }
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.user.create).not.toHaveBeenCalled();
  });

  it("records account acceptance and leaves optional alerts disabled", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.create.mockResolvedValue({ id: "buyer" });
    await expect(register(undefined, form(account))).rejects.toThrow("redirect:/cuenta");
    expect(mocks.db.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      alertsEnabled: false, legalVersion: LEGAL_VERSION,
      legalAcceptances: { create: [{ kind: "ACCOUNT", version: LEGAL_VERSION }] },
    }) });
  });

  it("records a separate opt-in when alerts are selected", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.create.mockResolvedValue({ id: "buyer" });
    await expect(register(undefined, form({ ...account, alerts: "on" }))).rejects.toThrow("redirect:/cuenta");
    expect(mocks.db.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      alertsEnabled: true, legalAcceptances: { create: [{ kind: "ACCOUNT", version: LEGAL_VERSION }, { kind: "ALERTS_ENABLED", version: LEGAL_VERSION }] },
    }) });
  });

  it("rejects direct action calls for contact, imports, listing and payments without consent", async () => {
    const contact = form({ kind: "INFO", name: "Comprador", phone: "8095551234", email: "", message: "", preferredDate: "" });
    expect(await requestContact("car", undefined, contact)).toHaveProperty("error");
    expect(await importListing(undefined, form({ url: "https://example.com/car" }))).toHaveProperty("error");
    mocks.requireUser.mockResolvedValue({ ...mocks.user, dealerId: "dealer" });
    expect(await startInventoryImport(undefined, form({ url: "https://example.com/dealer" }))).toHaveProperty("error");
    expect(await saveVehicle(null, undefined, form({}))).toHaveProperty("error");
    expect(await requestPlan(undefined, form({ planOffer: JSON.stringify(offer), paymentRef: "ref123" }))).toHaveProperty("error");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.vehicle.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.legalAcceptance.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("stores contact authorization in the same transaction as the request", async () => {
    mocks.db.vehicle.findUnique.mockResolvedValue({ id: "car", status: "ACTIVE", year: 2024, model: { name: "Corolla", brand: { name: "Toyota" } }, dealer: null, owner: { email: "seller@example.com" } });
    mocks.db.contactRequest.create.mockResolvedValue({ id: "request" });
    expect(await requestContact("car", undefined, form({ kind: "INFO", name: "Comprador", phone: "8095551234", email: "", message: "", preferredDate: "", accepted: "on", legalVersion: LEGAL_VERSION }))).toHaveProperty("ok");
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
    expect(mocks.db.legalAcceptance.create).toHaveBeenCalledWith({ data: { kind: "CONTACT", version: LEGAL_VERSION, subjectId: "request", details: { vehicleId: "car" } } });
  });

  it("keeps paid plans unavailable until operator identity is configured", async () => {
    vi.stubEnv("LEGAL_OPERATOR_NAME", "");
    expect(await requestPlan(undefined, form({ planOffer: JSON.stringify(offer), paymentRef: "ref123", accepted: "on", legalVersion: LEGAL_VERSION }))).toMatchObject({ error: expect.stringContaining("identificación") });
    expect(mocks.db.subscription.create).not.toHaveBeenCalled();
  });

  it("rejects a changed price instead of recording acceptance of an unseen offer", async () => {
    vi.stubEnv("LEGAL_OPERATOR_NAME", "Operador de prueba");
    vi.stubEnv("LEGAL_OPERATOR_RNC", "TEST");
    vi.stubEnv("LEGAL_OPERATOR_ADDRESS", "Dirección de prueba");
    vi.stubEnv("LEGAL_CONTACT_EMAIL", "legal@example.com");
    mocks.db.plan.findUnique.mockResolvedValue({ ...offer, priceDop: 2000, active: true, forDealers: false });
    expect(await requestPlan(undefined, form({ planOffer: JSON.stringify(offer), paymentRef: "ref123", accepted: "on", legalVersion: LEGAL_VERSION }))).toMatchObject({ error: expect.stringContaining("cambiaron") });
    expect(mocks.db.subscription.create).not.toHaveBeenCalled();
  });

  it("persists a complaint without depending on an email service", async () => {
    mocks.db.legalRequest.create.mockResolvedValue({ id: "reference" });
    expect(await submitLegalRequest(undefined, form({ kind: "PRIVACY", name: "Usuario", email: "user@example.com", reference: "", message: "Solicito cerrar mi cuenta y suprimir mis datos.", accepted: "on", legalVersion: LEGAL_VERSION }))).toMatchObject({ ok: expect.stringContaining("reference") });
    expect(mocks.db.legalRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ version: LEGAL_VERSION, kind: "PRIVACY" }) });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("stores the accepted plan benefits and payment request atomically", async () => {
    vi.stubEnv("LEGAL_OPERATOR_NAME", "Operador de prueba");
    vi.stubEnv("LEGAL_OPERATOR_RNC", "TEST");
    vi.stubEnv("LEGAL_OPERATOR_ADDRESS", "Dirección de prueba");
    vi.stubEnv("LEGAL_CONTACT_EMAIL", "legal@example.com");
    mocks.db.plan.findUnique.mockResolvedValue({ ...offer, active: true, forDealers: false });
    mocks.db.subscription.count.mockResolvedValue(0);
    mocks.db.subscription.create.mockResolvedValue({ id: "subscription" });
    expect(await requestPlan(undefined, form({ planOffer: JSON.stringify(offer), paymentRef: "ref123", accepted: "on", legalVersion: LEGAL_VERSION }))).toHaveProperty("ok");
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
    expect(mocks.db.legalAcceptance.create).toHaveBeenCalledWith({ data: { userId: mocks.user.id, kind: "PLAN", version: LEGAL_VERSION, subjectId: "subscription", details: { planId: offer.id, name: offer.name, priceDop: offer.priceDop, durationDays: offer.durationDays, maxActiveListings: offer.maxActiveListings, featuredSlots: offer.featuredSlots, officialSite: offer.officialSite, socialModule: offer.socialModule } } });
  });

  it("prevents administrators from reducing benefits of a contracted plan", async () => {
    mocks.db.plan.findUnique.mockResolvedValue({ ...offer, active: true, forDealers: false });
    mocks.db.subscription.count.mockResolvedValue(1);
    const data = form({ name: offer.name, description: "", priceDop: "1000", maxActiveListings: "2", featuredSlots: "1", durationDays: "30", active: "on" });
    expect(await savePlan(offer.id, undefined, data)).toMatchObject({ error: expect.stringContaining("Crea un plan nuevo") });
    expect(mocks.db.subscription.count).toHaveBeenCalledWith({ where: { planId: offer.id, status: { in: ["PENDING", "ACTIVE"] } } });
  });
});
