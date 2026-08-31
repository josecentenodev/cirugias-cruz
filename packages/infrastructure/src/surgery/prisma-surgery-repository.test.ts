import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { cleanupPhysician, cleanupSurgery, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaSurgeryRepository } from "./prisma-surgery-repository.js";

const PHYSICIAN_ID = "infra-test-physician-surgery";
const PATIENT_ID = "infra-test-patient-surgery";
const PROCEDURE_TYPE_ID = "infra-test-procedure-type-surgery";
const SURGERY_ID = "infra-test-surgery-1";

async function seedPatientAndProcedureType(): Promise<void> {
  await testPrisma.patient.upsert({
    where: { id: PATIENT_ID },
    create: {
      id: PATIENT_ID,
      physicianId: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-05-15"),
    },
    update: {},
  });
  await testPrisma.procedureType.upsert({
    where: { id: PROCEDURE_TYPE_ID },
    create: {
      id: PROCEDURE_TYPE_ID,
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
    },
    update: {},
  });
}

describe("PrismaSurgeryRepository", () => {
  const repository = new PrismaSurgeryRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
    await seedPatientAndProcedureType();
  });

  afterEach(async () => {
    await cleanupSurgery(SURGERY_ID);
  });

  afterAll(async () => {
    await testPrisma.patient.deleteMany({ where: { id: PATIENT_ID } });
    await testPrisma.procedureType.deleteMany({ where: { id: PROCEDURE_TYPE_ID } });
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when the surgery does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a surgery with no controls or residents and finds it back", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });

    await repository.save(surgery);
    const found = await repository.findById(SURGERY_ID);

    expect(found).not.toBeNull();
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.patientId).toBe(PATIENT_ID);
    expect(found?.procedureTypeId).toBe(PROCEDURE_TYPE_ID);
    expect(found?.performedAt).toEqual(new Date("2026-01-10"));
    expect(found?.controls).toHaveLength(0);
    expect(found?.participatingResidentIds).toHaveLength(0);
  });

  it("persists Controls (physician- and resident-authored) as part of saving the Surgery, and reconstructs them", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "Sin signos de infección",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });
    surgery.recordControl({
      id: "control-2",
      observations: "Evolución favorable",
      recordedAt: new Date("2026-01-18"),
      author: { type: "resident", residentId: "resident-1" },
    });

    await repository.save(surgery);
    const found = await repository.findById(SURGERY_ID);

    expect(found?.controls).toHaveLength(2);
    const physicianControl = found?.controls.find((c) => c.id === "control-1");
    const residentControl = found?.controls.find((c) => c.id === "control-2");
    expect(physicianControl?.author).toEqual({ type: "physician", physicianId: PHYSICIAN_ID });
    expect(physicianControl?.observations).toBe("Sin signos de infección");
    expect(residentControl?.author).toEqual({ type: "resident", residentId: "resident-1" });
    expect(residentControl?.recordedAt).toEqual(new Date("2026-01-18"));
  });

  it("persists participatingResidentIds and reconstructs them as a working roster", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.assignResident("resident-2", PHYSICIAN_ID);

    await repository.save(surgery);
    const found = await repository.findById(SURGERY_ID);

    expect(found?.participatingResidentIds).toEqual(
      expect.arrayContaining(["resident-1", "resident-2"]),
    );
    expect(found?.participatingResidentIds).toHaveLength(2);

    // Reconstructed roster still enforces the real domain invariant, not
    // just a flat copy of ids.
    found?.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });
    expect(() => found?.removeResident("resident-1", PHYSICIAN_ID)).toThrow();
    expect(() => found?.removeResident("resident-2", PHYSICIAN_ID)).not.toThrow();
  });

  it("updates a modified control in place on a second save, rather than duplicating it", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    surgery.recordControl({
      id: "control-1",
      observations: "original observations",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });
    await repository.save(surgery);

    const loaded = await repository.findById(SURGERY_ID);
    loaded?.modifyControl("control-1", { observations: "corrected observations" }, PHYSICIAN_ID);
    await repository.save(loaded as Surgery);

    const reloaded = await repository.findById(SURGERY_ID);
    expect(reloaded?.controls).toHaveLength(1);
    expect(reloaded?.controls[0]?.observations).toBe("corrected observations");

    const rowCount = await testPrisma.control.count({ where: { surgeryId: SURGERY_ID } });
    expect(rowCount).toBe(1);
  });

  it("keeps createdAt stable and advances updatedAt across saves", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    await repository.save(surgery);
    const firstRow = await testPrisma.surgery.findUniqueOrThrow({ where: { id: SURGERY_ID } });

    await new Promise((resolve) => setTimeout(resolve, 10));

    surgery.modify({ performedAt: new Date("2026-02-01") }, PHYSICIAN_ID);
    await repository.save(surgery);
    const secondRow = await testPrisma.surgery.findUniqueOrThrow({ where: { id: SURGERY_ID } });

    expect(secondRow.createdAt).toEqual(firstRow.createdAt);
    expect(secondRow.updatedAt.getTime()).toBeGreaterThan(firstRow.updatedAt.getTime());
  });
});
