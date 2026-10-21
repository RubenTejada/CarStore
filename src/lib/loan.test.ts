import { describe, expect, it } from "vitest";
import { monthlyPayment, quoteLoan } from "./loan";

describe("monthlyPayment", () => {
  it("calcula la cuota fija del sistema francés", () => {
    // RD$300,000 a 36 meses al 11.92 %: cuota publicada por los comparadores ≈ RD$9,953.
    expect(monthlyPayment(300_000, 11.92, 36)).toBeCloseTo(9_953.3, 0);
  });

  it("sin interés reparte el capital en partes iguales", () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000);
  });

  it("no cobra cuota sin capital o sin plazo", () => {
    expect(monthlyPayment(0, 12, 60)).toBe(0);
    expect(monthlyPayment(100_000, 12, 0)).toBe(0);
  });
});

describe("quoteLoan", () => {
  it("financia el precio menos el inicial y suma los intereses", () => {
    const q = quoteLoan(1_000_000, 20, 12, 60);
    expect(q.principal).toBe(800_000);
    expect(q.payment).toBeCloseTo(17_795.56, 1);
    expect(q.totalPaid).toBeCloseTo(q.payment * 60, 6);
    expect(q.totalInterest).toBeCloseTo(q.totalPaid - 800_000, 6);
  });

  it("con inicial del 100 % no hay préstamo", () => {
    expect(quoteLoan(500_000, 100, 12, 60)).toEqual({ principal: 0, payment: 0, totalInterest: 0, totalPaid: 0 });
  });
});
