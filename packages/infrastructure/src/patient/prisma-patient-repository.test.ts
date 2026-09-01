import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Patient } from "@cirugias-cruz/domain";
import { cleanupPatient, cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaPatientRepository } from "./prisma-patient-repository.js";

const PHYSICIAN_ID = "infra-test-physician-patient";
const OTHER_PHYSICIAN_ID = "infra-test-m4-physician-patient-other";

describe("PrismaPatientRepository", () => {
  const repository = new PrismaPatientRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
    await seedPhysician(OTHER_PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupPatient("infra-test-patient-1");
    await cleanupPatient("infra-test-m4-patient-2");
    await cleanupPatient("infra-test-m4-patient-other");
  });

  afterAll(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
    await cleanupPhysician(OTHER_PHYSICIAN_ID);
  });

  it("returns null when the patient does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a patient and finds it back with identical field values", async () => {
    const patient = Patient.create({
      id: "infra-test-patient-1",
      physicianId: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-05-15"),
      metadata: { insurance: "private" },
      observations: "Sin antecedentes relevantes",
    });

    await repository.save(patient);
    const found = await repository.findById("infra-test-patient-1");

    expect(found).not.toBeNull();
    expect(found?.id).toBe("infra-test-patient-1");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.firstName).toBe("Ana");
    expect(found?.lastName).toBe("García");
    expect(found?.dateOfBirth).toEqual(new Date("1990-05-15"));
    expect(found?.metadata).toEqual({ insurance: "private" });
    expect(found?.observations).toBe("Sin antecedentes relevantes");
  });

  it("updates an existing patient on a second save rather than duplicating it", async () => {
    const patient = Patient.create({
      id: "infra-test-patient-1",
      physicianId: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-05-15"),
    });
    await repository.save(patient);

    const updated = Patient.create({
      id: "infra-test-patient-1",
      physicianId: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana@example.com",
      dateOfBirth: new Date("1990-05-15"),
      observations: "updated observations",
    });
    await repository.save(updated);

    const found = await repository.findById("infra-test-patient-1");
    expect(found?.observations).toBe("updated observations");

    const rowCount = await testPrisma.patient.count({ where: { id: "infra-test-patient-1" } });
    expect(rowCount).toBe(1);
  });

  it("findByPhysicianId returns only the physician's own patients", async () => {
    await repository.save(
      Patient.create({
        id: "infra-test-patient-1",
        physicianId: PHYSICIAN_ID,
        firstName: "Ana",
        lastName: "García",
        phone: "555-0101",
        email: "ana@example.com",
        dateOfBirth: new Date("1990-05-15"),
      }),
    );
    await repository.save(
      Patient.create({
        id: "infra-test-m4-patient-2",
        physicianId: PHYSICIAN_ID,
        firstName: "Luis",
        lastName: "Ramírez",
        phone: "555-0102",
        email: "luis@example.com",
        dateOfBirth: new Date("1985-03-20"),
      }),
    );
    await repository.save(
      Patient.create({
        id: "infra-test-m4-patient-other",
        physicianId: OTHER_PHYSICIAN_ID,
        firstName: "Otro",
        lastName: "Físico",
        phone: "555-0103",
        email: "otro@example.com",
        dateOfBirth: new Date("1970-01-01"),
      }),
    );

    const found = await repository.findByPhysicianId(PHYSICIAN_ID);

    expect(found.map((p) => p.id).sort()).toEqual([
      "infra-test-m4-patient-2",
      "infra-test-patient-1",
    ]);
  });
});
