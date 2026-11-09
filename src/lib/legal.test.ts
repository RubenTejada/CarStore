import { afterEach, expect, it, vi } from "vitest";
import { legalOperator, legalOperatorReady } from "./legal";

afterEach(() => vi.unstubAllEnvs());

it("returns only the last four document digits for public identification", () => {
  vi.stubEnv("LEGAL_OPERATOR_DOCUMENT", "999-9999000-1");
  expect(legalOperator().documentLast4).toBe("0001");
  expect(JSON.stringify(legalOperator())).not.toContain("99999990001");
  expect(JSON.stringify(legalOperator())).not.toContain("999-9999000-1");
});

it("does not treat a personal document as proof of a tax registration", () => {
  vi.stubEnv("LEGAL_OPERATOR_NAME", "Operador de prueba");
  vi.stubEnv("LEGAL_OPERATOR_DOCUMENT", "99999990001");
  vi.stubEnv("LEGAL_OPERATOR_RNC", "");
  vi.stubEnv("LEGAL_OPERATOR_ADDRESS", "Dirección de prueba");
  vi.stubEnv("LEGAL_CONTACT_EMAIL", "legal@example.com");
  expect(legalOperatorReady()).toBe(false);
});
