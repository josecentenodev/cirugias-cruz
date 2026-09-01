import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Resident } from "@cirugias-cruz/domain";
import {
  cleanupPhysician,
  cleanupResident,
  seedPhysician,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaResidentRepository } from "./prisma-resident-repository.js";

const PHYSICIAN_ID = "infra-test-m5-physician-resident";
const RESIDENT_ID = "infra-test-m5-resident-1";
const RESIDENT_ID_2 = "infra-test-m5-resident-2";

describe("PrismaResidentRepository", () => {
  const repository = new PrismaResidentRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupResident(RESIDENT_ID);
    await cleanupResident(RESIDENT_ID_2);
  });

  afterAll(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when the resident does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a resident and finds it back with identical field values", async () => {
    const resident = Resident.create({
      id: RESIDENT_ID,
      physicianId: PHYSICIAN_ID,
      firstName: "Laura",
      lastName: "Diaz",
      phone: "+54 11 3333-3333",
      email: "laura@example.com",
      dateOfBirth: new Date("1995-02-02"),
      metadata: { program: "cardio" },
    });

    await repository.save(resident);
    const found = await repository.findById(RESIDENT_ID);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(RESIDENT_ID);
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.firstName).toBe("Laura");
    expect(found?.lastName).toBe("Diaz");
    expect(found?.dateOfBirth).toEqual(new Date("1995-02-02"));
    expect(found?.metadata).toEqual({ program: "cardio" });
  });

  it("updates an existing resident on a second save rather than duplicating it", async () => {
    const resident = Resident.create({
      id: RESIDENT_ID,
      physicianId: PHYSICIAN_ID,
      firstName: "Laura",
      lastName: "Diaz",
      phone: "+54 11 3333-3333",
      email: "laura@example.com",
      dateOfBirth: new Date("1995-02-02"),
    });
    await repository.save(resident);

    const updated = Resident.create({
      id: RESIDENT_ID,
      physicianId: PHYSICIAN_ID,
      firstName: "Laura",
      lastName: "Diaz Updated",
      phone: "+54 11 3333-3333",
      email: "laura@example.com",
      dateOfBirth: new Date("1995-02-02"),
    });
    await repository.save(updated);

    const found = await repository.findById(RESIDENT_ID);
    expect(found?.lastName).toBe("Diaz Updated");

    const rowCount = await testPrisma.resident.count({ where: { id: RESIDENT_ID } });
    expect(rowCount).toBe(1);
  });

  it("finds all residents belonging to a physician", async () => {
    const resident1 = Resident.create({
      id: RESIDENT_ID,
      physicianId: PHYSICIAN_ID,
      firstName: "Laura",
      lastName: "Diaz",
      phone: "+54 11 3333-3333",
      email: "laura@example.com",
      dateOfBirth: new Date("1995-02-02"),
    });
    const resident2 = Resident.create({
      id: RESIDENT_ID_2,
      physicianId: PHYSICIAN_ID,
      firstName: "Marco",
      lastName: "Rossi",
      phone: "+54 11 4444-4444",
      email: "marco@example.com",
      dateOfBirth: new Date("1993-03-03"),
    });
    await repository.save(resident1);
    await repository.save(resident2);

    const found = await repository.findByPhysicianId(PHYSICIAN_ID);

    expect(found.map((r) => r.id).sort()).toEqual([RESIDENT_ID, RESIDENT_ID_2].sort());
  });
});
