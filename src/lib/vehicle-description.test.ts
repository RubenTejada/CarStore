import { describe, expect, it } from "vitest";
import { vehicleFacts } from "./vehicle-description";

describe("vehicleFacts", () => {
  it("lists only the filled-in data", () => {
    const facts = vehicleFacts({
      title: "Toyota RAV4 XLE",
      year: 2020,
      condition: "USED",
      mileageKm: 45000,
      transmission: "AUTOMATIC",
      fuel: null,
      drivetrain: "AWD",
      engine: "",
      extColor: "Gris",
      intColor: "",
      doors: null,
      seats: 5,
      features: ["Cámara de reversa", "Apple CarPlay"],
    });
    expect(facts.split("\n")).toEqual([
      "Vehículo: Toyota RAV4 XLE 2020",
      "Condición: Usado",
      "Kilometraje: 45,000 km",
      "Transmisión: Automática",
      "Tracción: Integral (AWD)",
      "Color exterior: Gris",
      "Pasajeros: 5",
      "Características: Cámara de reversa, Apple CarPlay",
    ]);
  });

  it("omits mileage for new vehicles", () => {
    const facts = vehicleFacts({ title: "Kia K5", year: 2026, condition: "NEW", mileageKm: 0, transmission: null, fuel: null, drivetrain: null, engine: "", extColor: "", intColor: "", doors: null, seats: null, features: [] });
    expect(facts).toBe("Vehículo: Kia K5 2026\nCondición: Nuevo");
  });
});
