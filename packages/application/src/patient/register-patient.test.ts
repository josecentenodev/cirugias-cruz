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

  it("persists an optional dni", async () => {
    const deps = buildDeps();

    await registerPatient(deps)({ ...validInput, dni: "30111222" });

    const persisted = await deps.patientRepository.findById("patient-1");
    expect(persisted?.dni).toBe("30111222");
  });

  it("rejects a second patient with a dni already used in the same tenant", async () => {
    const deps = buildDeps();
    await registerPatient(deps)({ ...validInput, dni: "30111222" });

    await expect(
      registerPatient(deps)({ ...validInput, id: "patient-2", dni: "30111222" }),
    ).rejects.toThrow(/DNI already exists/);
  });

  it("allows the same dni in a different physician's tenant", async () => {
    const deps = buildDeps();
    await registerPatient(deps)({ ...validInput, dni: "30111222" });

    await expect(
      registerPatient(deps)({
        ...validInput,
        id: "patient-2",
        physicianId: "physician-2",
        dni: "30111222",
      }),
    ).resolves.toEqual({ patientId: "patient-2" });
  });

  it("allows multiple patients with no dni", async () => {
    const deps = buildDeps();
    await registerPatient(deps)(validInput);

    await expect(registerPatient(deps)({ ...validInput, id: "patient-2" })).resolves.toEqual({
      patientId: "patient-2",
    });
  });
});
