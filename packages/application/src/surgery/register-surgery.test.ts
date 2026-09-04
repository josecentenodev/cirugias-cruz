import { describe, expect, it } from "vitest";
import { CustomField, Patient, ProcedureType } from "@cirugias-cruz/domain";
import {
  InMemoryPatientRepository,
  InMemoryProcedureTypeRepository,
  InMemorySurgeryRepository,
} from "../testing/fakes.js";
import { registerSurgery } from "./register-surgery.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return {
    surgeryRepository: new InMemorySurgeryRepository(),
    patientRepository: new InMemoryPatientRepository(),
    procedureTypeRepository: new InMemoryProcedureTypeRepository(),
  };
}

function seedPatient(patientRepository: InMemoryPatientRepository, physicianId = PHYSICIAN_ID) {
  const patient = Patient.create({
    id: "patient-1",
    physicianId,
    firstName: "Ana",
    lastName: "Gomez",
    phone: "+54 11 5555-5555",
    email: "ana@example.com",
    dateOfBirth: new Date("1990-01-01"),
  });
  patientRepository.seed(patient);
  return patient;
}

function seedProcedureType(
  procedureTypeRepository: InMemoryProcedureTypeRepository,
  physicianId = PHYSICIAN_ID,
) {
  const procedureType = ProcedureType.create({
    id: "procedure-type-1",
    physicianId,
    name: "Pterigión",
  });
  procedureTypeRepository.seed(procedureType);
  return procedureType;
}

const validInput = {
  physicianId: PHYSICIAN_ID,
  id: "surgery-1",
  patientId: "patient-1",
  procedureTypeId: "procedure-type-1",
  performedAt: new Date("2026-01-10"),
};

describe("registerSurgery", () => {
  it("registers the surgery once the patient and procedure type are verified same-tenant", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);
    seedProcedureType(deps.procedureTypeRepository);

    const output = await registerSurgery(deps)(validInput);

    expect(output).toEqual({ surgeryId: "surgery-1" });
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.patientId).toBe("patient-1");
    expect(persisted?.procedureTypeId).toBe("procedure-type-1");
    expect(persisted?.state).toBe("DONE");
  });

  it("throws NotFoundError when the patient does not exist", async () => {
    const deps = buildDeps();
    seedProcedureType(deps.procedureTypeRepository);

    await expect(registerSurgery(deps)(validInput)).rejects.toThrow(/was not found/);
  });

  it("throws NotFoundError when the procedure type does not exist", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);

    await expect(registerSurgery(deps)(validInput)).rejects.toThrow(/was not found/);
  });

  it("rejects a patient belonging to a different tenant", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository, OTHER_PHYSICIAN_ID);
    seedProcedureType(deps.procedureTypeRepository);

    await expect(registerSurgery(deps)(validInput)).rejects.toThrow(/same tenant/);
  });

  it("rejects a procedure type belonging to a different tenant", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);
    seedProcedureType(deps.procedureTypeRepository, OTHER_PHYSICIAN_ID);

    await expect(registerSurgery(deps)(validInput)).rejects.toThrow(/same tenant/);
  });

  it("accepts a SURGERY-scoped CustomField value matching the procedure type's definition", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);
    const procedureType = seedProcedureType(deps.procedureTypeRepository);
    procedureType.addCustomField(
      CustomField.create({
        id: "cf-technique",
        name: "Surgical technique",
        unit: "n/a",
        magnitude: "technique",
        scope: "SURGERY",
        constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic membrane"] },
      }),
      PHYSICIAN_ID,
    );
    await deps.procedureTypeRepository.save(procedureType);

    const output = await registerSurgery(deps)({
      ...validInput,
      customFieldValues: [{ definitionId: "cf-technique", value: "Autograft" }],
    });

    expect(output).toEqual({ surgeryId: "surgery-1" });
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.customFieldValues[0]?.value).toBe("Autograft");
  });

  it("rejects a CustomField value outside its ENUM constraint's options", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);
    const procedureType = seedProcedureType(deps.procedureTypeRepository);
    procedureType.addCustomField(
      CustomField.create({
        id: "cf-technique",
        name: "Surgical technique",
        unit: "n/a",
        magnitude: "technique",
        scope: "SURGERY",
        constraint: { valueType: "ENUM", options: ["Autograft"] },
      }),
      PHYSICIAN_ID,
    );
    await deps.procedureTypeRepository.save(procedureType);

    await expect(
      registerSurgery(deps)({
        ...validInput,
        customFieldValues: [{ definitionId: "cf-technique", value: "Not a real option" }],
      }),
    ).rejects.toThrow(/must be one of/);
  });

  it("rejects a CustomField value whose scope does not match SURGERY", async () => {
    const deps = buildDeps();
    seedPatient(deps.patientRepository);
    const procedureType = seedProcedureType(deps.procedureTypeRepository);
    procedureType.addCustomField(
      CustomField.create({
        id: "cf-eva",
        name: "Pain (EVA)",
        unit: "0-10",
        magnitude: "pain",
        scope: "CONTROL",
        constraint: { valueType: "NUMBER", min: 0, max: 10 },
      }),
      PHYSICIAN_ID,
    );
    await deps.procedureTypeRepository.save(procedureType);

    await expect(
      registerSurgery(deps)({
        ...validInput,
        customFieldValues: [{ definitionId: "cf-eva", value: 3 }],
      }),
    ).rejects.toThrow(/scoped to CONTROL/);
  });
});
