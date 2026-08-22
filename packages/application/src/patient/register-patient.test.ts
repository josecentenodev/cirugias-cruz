import { describe, expect, it } from "vitest";
import { InMemoryPatientRepository } from "../testing/fakes.js";
import { registerPatient } from "./register-patient.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { patientRepository: new InMemoryPatientRepository() };
}

const validInput = {
  physicianId: PHYSICIAN_ID,
  id: "patient-1",
  firstName: "Ana",
  lastName: "Gomez",
  phone: "+54 11 5555-5555",
  email: "ana@example.com",
  dateOfBirth: new Date("1990-01-01"),
};

describe("registerPatient", () => {
  it("registers the patient in the acting physician's tenant and persists it", async () => {
    const deps = buildDeps();

    const output = await registerPatient(deps)(validInput);

    expect(output).toEqual({ patientId: "patient-1" });
    const persisted = await deps.patientRepository.findById("patient-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.firstName).toBe("Ana");
  });

  it("accepts optional metadata and observations", async () => {
    const deps = buildDeps();

    await registerPatient(deps)({
      ...validInput,
      metadata: { insurance: "OSDE" },
      observations: "Prefers morning appointments",
    });

    const persisted = await deps.patientRepository.findById("patient-1");
    expect(persisted?.metadata).toEqual({ insurance: "OSDE" });
    expect(persisted?.observations).toBe("Prefers morning appointments");
  });

  it("lets the domain reject registration when required personal information is missing", async () => {
    const deps = buildDeps();

    await expect(registerPatient(deps)({ ...validInput, lastName: "" })).rejects.toThrow();
  });
});
