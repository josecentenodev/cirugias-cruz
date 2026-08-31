import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Patient } from "@cirugias-cruz/domain";
import { cleanupPatient, cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaPatientRepository } from "./prisma-patient-repository.js";

const PHYSICIAN_ID = "infra-test-physician-patient";

describe("PrismaPatientRepository", () => {
  const repository = new PrismaPatientRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupPatient("infra-test-patient-1");
  });

  afterAll(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
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
});
