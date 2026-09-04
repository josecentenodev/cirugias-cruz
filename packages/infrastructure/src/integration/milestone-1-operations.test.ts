import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  modifyControl,
  recordControl,
  registerPatient,
  registerProcedureType,
  registerSurgery,
} from "@cirugias-cruz/application";
import { cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaPatientRepository } from "../patient/prisma-patient-repository.js";
import { PrismaProcedureTypeRepository } from "../procedure-type/prisma-procedure-type-repository.js";
import { PrismaSurgeryRepository } from "../surgery/prisma-surgery-repository.js";

/**
 * This is the test that actually satisfies Milestone 2's Definition of
 * Done: every Milestone 1 Application operation, run against the real
 * Prisma-backed repositories instead of the in-memory fakes used in
 * packages/application's own test suite, produces the same externally
 * observable result. No fake appears anywhere in this file.
 */
describe("Milestone 1 operations against real Prisma repositories", () => {
  const PHYSICIAN_ID = "infra-test-physician-m1-ops";
  const PATIENT_ID = "infra-test-patient-m1-ops";
  const PROCEDURE_TYPE_ID = "infra-test-procedure-type-m1-ops";
  const SURGERY_ID = "infra-test-surgery-m1-ops";
  const CONTROL_ID = "infra-test-control-m1-ops";

  const patientRepository = new PrismaPatientRepository(testPrisma);
  const procedureTypeRepository = new PrismaProcedureTypeRepository(testPrisma);
  const surgeryRepository = new PrismaSurgeryRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterAll(async () => {
    await testPrisma.control.deleteMany({ where: { surgeryId: SURGERY_ID } });
    await testPrisma.surgery.deleteMany({ where: { id: SURGERY_ID } });
    await testPrisma.patient.deleteMany({ where: { id: PATIENT_ID } });
    await testPrisma.procedureType.deleteMany({ where: { id: PROCEDURE_TYPE_ID } });
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("registerPatient persists a real, retrievable Patient", async () => {
    const output = await registerPatient({ patientRepository })({
      physicianId: PHYSICIAN_ID,
      id: PATIENT_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-05-15"),
    });

    expect(output).toEqual({ patientId: PATIENT_ID });
    const found = await patientRepository.findById(PATIENT_ID);
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
  });

  it("registerProcedureType persists a real, retrievable ProcedureType", async () => {
    const output = await registerProcedureType({ procedureTypeRepository })({
      physicianId: PHYSICIAN_ID,
      id: PROCEDURE_TYPE_ID,
      name: "Pterigión",
      technique: "Conjunctival autograft",
    });

    expect(output).toEqual({ procedureTypeId: PROCEDURE_TYPE_ID });
    const found = await procedureTypeRepository.findById(PROCEDURE_TYPE_ID);
    expect(found?.name).toBe("Pterigión");
  });

  it("registerSurgery orchestrates real Patient/ProcedureType/Surgery repositories and enforces the tenant check", async () => {
    const output = await registerSurgery({
      surgeryRepository,
      patientRepository,
      procedureTypeRepository,
    })({
      physicianId: PHYSICIAN_ID,
      id: SURGERY_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });

    expect(output).toEqual({ surgeryId: SURGERY_ID });
    const found = await surgeryRepository.findById(SURGERY_ID);
    expect(found?.physicianId).toBe(PHYSICIAN_ID);

    // The same cross-repository tenant check proven in Application's own
    // fake-backed tests must still hold against real repositories.
    await expect(
      registerSurgery({ surgeryRepository, patientRepository, procedureTypeRepository })({
        physicianId: "some-other-physician",
        id: "infra-test-surgery-cross-tenant",
        patientId: PATIENT_ID,
        procedureTypeId: PROCEDURE_TYPE_ID,
        performedAt: new Date("2026-01-10"),
      }),
    ).rejects.toThrow(/same tenant/);
  });

  it("recordControl persists the resulting Surgery aggregate, including its Control", async () => {
    const output = await recordControl({ surgeryRepository, procedureTypeRepository })({
      physicianId: PHYSICIAN_ID,
      surgeryId: SURGERY_ID,
      id: CONTROL_ID,
      observations: "Sin signos de infección",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician" },
    });

    expect(output).toEqual({ surgeryId: SURGERY_ID, controlId: CONTROL_ID });
    const found = await surgeryRepository.findById(SURGERY_ID);
    expect(found?.controls).toHaveLength(1);
    expect(found?.controls[0]?.observations).toBe("Sin signos de infección");
  });

  it("modifyControl persists the modified Surgery aggregate and its Control state", async () => {
    const output = await modifyControl({ surgeryRepository })({
      physicianId: PHYSICIAN_ID,
      surgeryId: SURGERY_ID,
      controlId: CONTROL_ID,
      changes: { observations: "Evolución favorable, sin complicaciones" },
      actor: { type: "physician" },
    });

    expect(output).toEqual({ surgeryId: SURGERY_ID, controlId: CONTROL_ID });
    const found = await surgeryRepository.findById(SURGERY_ID);
    expect(found?.controls).toHaveLength(1);
    expect(found?.controls[0]?.observations).toBe("Evolución favorable, sin complicaciones");
  });
});
