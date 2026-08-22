import { describe, expect, it } from "vitest";
import { Patient, ProcedureType } from "@cirugias-cruz/domain";
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
});
