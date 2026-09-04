import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { cleanupPhysician, cleanupSurgery, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaSurgeryRepository } from "./prisma-surgery-repository.js";

const PHYSICIAN_ID = "infra-test-physician-surgery";
const PATIENT_ID = "infra-test-patient-surgery";
const PROCEDURE_TYPE_ID = "infra-test-procedure-type-surgery";
const SURGERY_ID = "infra-test-surgery-1";
const OTHER_PHYSICIAN_ID = "infra-test-m4-physician-surgery-other";
const OTHER_PATIENT_ID = "infra-test-m4-patient-surgery-other";
const OTHER_PROCEDURE_TYPE_ID = "infra-test-m4-procedure-type-surgery-other";
const SURGERY_ID_2 = "infra-test-m4-surgery-2";
const OTHER_SURGERY_ID = "infra-test-m4-surgery-other";
const CF_TECHNIQUE_ID = "infra-test-cf-technique";
const CF_EVA_ID = "infra-test-cf-eva";

async function seedPatientAndProcedureType(): Promise<void> {
  await Promise.all([
    testPrisma.patient.upsert({
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
    }),
    testPrisma.procedureType.upsert({
      where: { id: PROCEDURE_TYPE_ID },
      create: {
        id: PROCEDURE_TYPE_ID,
        physicianId: PHYSICIAN_ID,
        name: "Pterigión",
      },
      update: {},
    }),
  ]);
  await Promise.all([
    testPrisma.customFieldDefinition.upsert({
      where: { id: CF_TECHNIQUE_ID },
      create: {
        id: CF_TECHNIQUE_ID,
        procedureTypeId: PROCEDURE_TYPE_ID,
        name: "Surgical technique",
        unit: "n/a",
        magnitude: "technique",
        scope: "SURGERY",
        valueType: "ENUM",
        enumOptions: ["Autograft", "Amniotic membrane"],
      },
      update: {},
    }),
    testPrisma.customFieldDefinition.upsert({
      where: { id: CF_EVA_ID },
      create: {
        id: CF_EVA_ID,
        procedureTypeId: PROCEDURE_TYPE_ID,
        name: "Pain (EVA)",
        unit: "0-10",
        magnitude: "pain",
        scope: "CONTROL",
        valueType: "NUMBER",
        constraintMin: "0",
        constraintMax: "10",
      },
      update: {},
    }),
  ]);
}

describe("PrismaSurgeryRepository", () => {
  const repository = new PrismaSurgeryRepository(testPrisma);

  beforeAll(async () => {
    await Promise.all([seedPhysician(PHYSICIAN_ID), seedPhysician(OTHER_PHYSICIAN_ID)]);
    await Promise.all([
      seedPatientAndProcedureType(),
      testPrisma.patient.upsert({
        where: { id: OTHER_PATIENT_ID },
        create: {
          id: OTHER_PATIENT_ID,
          physicianId: OTHER_PHYSICIAN_ID,
          firstName: "Otro",
          lastName: "Físico",
          phone: "555-0104",
          email: "otro-surgery@example.com",
          dateOfBirth: new Date("1975-01-01"),
        },
        update: {},
      }),
      testPrisma.procedureType.upsert({
        where: { id: OTHER_PROCEDURE_TYPE_ID },
        create: { id: OTHER_PROCEDURE_TYPE_ID, physicianId: OTHER_PHYSICIAN_ID, name: "Otro" },
        update: {},
      }),
    ]);
  }, 30000);

  afterEach(async () => {
    await Promise.all([
      cleanupSurgery(SURGERY_ID),
      cleanupSurgery(SURGERY_ID_2),
      cleanupSurgery(OTHER_SURGERY_ID),
    ]);
  }, 30000);

  afterAll(async () => {
    await testPrisma.customFieldDefinition.deleteMany({
      where: { id: { in: [CF_TECHNIQUE_ID, CF_EVA_ID] } },
    });
    await Promise.all([
      testPrisma.patient.deleteMany({ where: { id: PATIENT_ID } }),
      testPrisma.procedureType.deleteMany({ where: { id: PROCEDURE_TYPE_ID } }),
      testPrisma.patient.deleteMany({ where: { id: OTHER_PATIENT_ID } }),
      testPrisma.procedureType.deleteMany({ where: { id: OTHER_PROCEDURE_TYPE_ID } }),
    ]);
    await Promise.all([cleanupPhysician(PHYSICIAN_ID), cleanupPhysician(OTHER_PHYSICIAN_ID)]);
  }, 30000);

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

  it("persists SURGERY- and CONTROL-scoped CustomField values and reconstructs them", async () => {
    const surgery = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
      customFieldValues: [{ definitionId: CF_TECHNIQUE_ID, value: "Autograft" }],
    });
    surgery.recordControl({
      id: "control-1",
      observations: "Sin signos de infección",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
      customFieldValues: [{ definitionId: CF_EVA_ID, value: 3 }],
    });

    await repository.save(surgery);
    const found = await repository.findById(SURGERY_ID);

    expect(found?.customFieldValues).toHaveLength(1);
    expect(found?.customFieldValues[0]).toMatchObject({
      definitionId: CF_TECHNIQUE_ID,
      value: "Autograft",
    });
    expect(found?.controls[0]?.customFieldValues).toHaveLength(1);
    expect(found?.controls[0]?.customFieldValues[0]).toMatchObject({
      definitionId: CF_EVA_ID,
      value: 3,
    });
  }, 15000);

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
    loaded?.modifyControl(
      "control-1",
      { observations: "corrected observations" },
      { type: "physician", physicianId: PHYSICIAN_ID },
    );
    await repository.save(loaded as Surgery);

    const reloaded = await repository.findById(SURGERY_ID);
    expect(reloaded?.controls).toHaveLength(1);
    expect(reloaded?.controls[0]?.observations).toBe("corrected observations");

    const rowCount = await testPrisma.control.count({ where: { surgeryId: SURGERY_ID } });
    expect(rowCount).toBe(1);
  }, 15000);

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

  it("findByPhysicianId returns only the physician's own surgeries, with full Control history", async () => {
    const surgery1 = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    surgery1.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });
    await repository.save(surgery1);

    await repository.save(
      Surgery.create({
        id: SURGERY_ID_2,
        physicianId: PHYSICIAN_ID,
        patientId: PATIENT_ID,
        procedureTypeId: PROCEDURE_TYPE_ID,
        performedAt: new Date("2026-02-01"),
      }),
    );

    await repository.save(
      Surgery.create({
        id: OTHER_SURGERY_ID,
        physicianId: OTHER_PHYSICIAN_ID,
        patientId: OTHER_PATIENT_ID,
        procedureTypeId: OTHER_PROCEDURE_TYPE_ID,
        performedAt: new Date("2026-01-15"),
      }),
    );

    const found = await repository.findByPhysicianId(PHYSICIAN_ID);

    expect(found.map((s) => s.id).sort()).toEqual([SURGERY_ID, SURGERY_ID_2].sort());
    const withControl = found.find((s) => s.id === SURGERY_ID);
    expect(withControl?.controls).toHaveLength(1);
    expect(withControl?.controls[0]?.observations).toBe("obs");
  }, 15000);

  it("findByResidentId returns only the surgeries that resident participates in (ADR 0017)", async () => {
    const surgeryWithResident = Surgery.create({
      id: SURGERY_ID,
      physicianId: PHYSICIAN_ID,
      patientId: PATIENT_ID,
      procedureTypeId: PROCEDURE_TYPE_ID,
      performedAt: new Date("2026-01-10"),
    });
    surgeryWithResident.assignResident("resident-panel-1", PHYSICIAN_ID);
    await repository.save(surgeryWithResident);

    await repository.save(
      Surgery.create({
        id: SURGERY_ID_2,
        physicianId: PHYSICIAN_ID,
        patientId: PATIENT_ID,
        procedureTypeId: PROCEDURE_TYPE_ID,
        performedAt: new Date("2026-02-01"),
      }),
    );

    const found = await repository.findByResidentId("resident-panel-1");

    expect(found.map((s) => s.id)).toEqual([SURGERY_ID]);
  });
});
