import { describe, expect, it } from "vitest";
import { Patient, ProcedureType, Surgery } from "@cirugias-cruz/domain";
import {
  InMemoryPatientRepository,
  InMemoryProcedureTypeRepository,
  InMemorySurgeryRepository,
} from "../testing/fakes.js";
import { listSurgeriesForResident } from "./list-surgeries-for-resident.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  const patientRepository = new InMemoryPatientRepository();
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  patientRepository.seed(
    Patient.create({
      id: "patient-1",
      physicianId: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "Gomez",
      phone: "+54 11 5555-5555",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-01-01"),
    }),
  );
  procedureTypeRepository.seed(
    ProcedureType.create({ id: "procedure-type-1", physicianId: PHYSICIAN_ID, name: "Pterigión" }),
  );
  return {
    surgeryRepository: new InMemorySurgeryRepository(),
    patientRepository,
    procedureTypeRepository,
  };
}

function surgery(id: string) {
  return Surgery.create({
    id,
    physicianId: PHYSICIAN_ID,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
}

describe("listSurgeriesForResident", () => {
  it("returns only surgeries the resident participates in, with the patient/procedure type name resolved", async () => {
    const deps = buildDeps();
    const mine = surgery("surgery-mine");
    mine.assignResident("resident-1", PHYSICIAN_ID);
    const notMine = surgery("surgery-not-mine");
    deps.surgeryRepository.seed(mine);
    deps.surgeryRepository.seed(notMine);

    const result = await listSurgeriesForResident(deps)({ residentId: "resident-1" });

    expect(result.map((entry) => entry.surgery.id)).toEqual(["surgery-mine"]);
    expect(result[0]?.patientName).toBe("Ana Gomez");
    expect(result[0]?.procedureTypeName).toBe("Pterigión");
  });

  it("returns an empty list when the resident participates in nothing", async () => {
    const deps = buildDeps();
    deps.surgeryRepository.seed(surgery("surgery-1"));

    const result = await listSurgeriesForResident(deps)({ residentId: "resident-1" });

    expect(result).toEqual([]);
  });

  it("falls back to the raw id when the patient/procedure type can no longer be found", async () => {
    const deps = buildDeps();
    const mine = surgery("surgery-mine");
    mine.assignResident("resident-1", PHYSICIAN_ID);
    deps.surgeryRepository.seed(mine);
    deps.patientRepository = new InMemoryPatientRepository();
    deps.procedureTypeRepository = new InMemoryProcedureTypeRepository();

    const result = await listSurgeriesForResident(deps)({ residentId: "resident-1" });

    expect(result[0]?.patientName).toBe("patient-1");
    expect(result[0]?.procedureTypeName).toBe("procedure-type-1");
  });
});
