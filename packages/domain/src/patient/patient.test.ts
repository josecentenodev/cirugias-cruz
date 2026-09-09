import { describe, expect, it } from "vitest";
import { Patient } from "./patient.js";

const validAttributes = {
  id: "patient-1",
  physicianId: "physician-1",
  firstName: "Ana",
  lastName: "Gomez",
  dateOfBirth: new Date("1990-01-01"),
};

describe("Patient", () => {
  it("belongs to the physician tenant that created it", () => {
    const patient = Patient.create(validAttributes);

    expect(patient.physicianId).toBe("physician-1");
  });

  it("cannot be created without an owning physician (tenant)", () => {
    expect(() => Patient.create({ ...validAttributes, physicianId: "" })).toThrow();
  });

  it("cannot be created without an id", () => {
    expect(() => Patient.create({ ...validAttributes, id: "" })).toThrow();
  });

  it("two patients belonging to different physicians are never the same patient, even with identical personal data", () => {
    const patientOfPhysicianA = Patient.create({
      ...validAttributes,
      id: "shared-id",
      physicianId: "physician-a",
    });
    const patientOfPhysicianB = Patient.create({
      ...validAttributes,
      id: "shared-id",
      physicianId: "physician-b",
    });

    expect(patientOfPhysicianA.sameIdentityAs(patientOfPhysicianB)).toBe(false);
  });

  it("two patient records within the same physician tenant with the same id are the same patient", () => {
    const first = Patient.create(validAttributes);
    const second = Patient.create(validAttributes);

    expect(first.sameIdentityAs(second)).toBe(true);
  });

  it("cannot be created without the required personal information", () => {
    expect(() => Patient.create({ ...validAttributes, firstName: "" })).toThrow();
    expect(() => Patient.create({ ...validAttributes, lastName: "" })).toThrow();
  });

  it("exposes no phone or email — Patient carries no contact PII (ADR 0025)", () => {
    const patient = Patient.create(validAttributes) as unknown as Record<string, unknown>;

    expect(patient.phone).toBeUndefined();
    expect(patient.email).toBeUndefined();
  });

  it("keeps an optional dni, trimmed", () => {
    const patient = Patient.create({ ...validAttributes, dni: "  30111222  " });

    expect(patient.dni).toBe("30111222");
  });

  it("treats a blank dni as absent", () => {
    expect(Patient.create({ ...validAttributes, dni: "   " }).dni).toBeUndefined();
    expect(Patient.create({ ...validAttributes }).dni).toBeUndefined();
  });

  it("does not enforce dni uniqueness itself — two patients in different tenants may share one", () => {
    const a = Patient.create({ ...validAttributes, physicianId: "physician-a", dni: "30111222" });
    const b = Patient.create({ ...validAttributes, physicianId: "physician-b", dni: "30111222" });

    expect(a.dni).toBe("30111222");
    expect(b.dni).toBe("30111222");
    expect(a.sameIdentityAs(b)).toBe(false);
  });
});
