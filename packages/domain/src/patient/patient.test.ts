import { describe, expect, it } from "vitest";
import { Patient } from "./patient.js";

const validAttributes = {
  id: "patient-1",
  physicianId: "physician-1",
  firstName: "Ana",
  lastName: "Gomez",
  phone: "+54 11 5555-5555",
  email: "ana@example.com",
  dateOfBirth: new Date("1990-01-01"),
};

describe("Patient", () => {
  it("belongs to the physician tenant that created it", () => {
    const patient = Patient.create(validAttributes);

    expect(patient.physicianId).toBe("physician-1");
  });

  it("cannot be created without an owning physician (tenant)", () => {
    expect(() =>
      Patient.create({ ...validAttributes, physicianId: "" }),
    ).toThrow();
  });

  it("cannot be created without an id", () => {
    expect(() => Patient.create({ ...validAttributes, id: "" })).toThrow();
  });

  it("two patients belonging to different physicians are never the same patient, even with identical personal data", () => {
    const patientOfPhysicianA = Patient.create({ ...validAttributes, id: "shared-id", physicianId: "physician-a" });
    const patientOfPhysicianB = Patient.create({ ...validAttributes, id: "shared-id", physicianId: "physician-b" });

    expect(patientOfPhysicianA.sameIdentityAs(patientOfPhysicianB)).toBe(false);
  });

  it("two patient records within the same physician tenant with the same id are the same patient", () => {
    const first = Patient.create(validAttributes);
    const second = Patient.create(validAttributes);

    expect(first.sameIdentityAs(second)).toBe(true);
  });
});
