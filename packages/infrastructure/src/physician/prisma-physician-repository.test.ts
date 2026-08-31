import { afterEach, describe, expect, it } from "vitest";
import { Physician } from "@cirugias-cruz/domain";
import { cleanupPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaPhysicianRepository } from "./prisma-physician-repository.js";

const PHYSICIAN_ID = "infra-test-physician-repo";

describe("PrismaPhysicianRepository", () => {
  const repository = new PrismaPhysicianRepository(testPrisma);

  afterEach(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when the physician does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a physician and finds it back with identical field values", async () => {
    const physician = Physician.create({
      id: PHYSICIAN_ID,
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email: "ana-repo@example.com",
      dateOfBirth: new Date("1980-01-01"),
    });

    await repository.save(physician);
    const found = await repository.findById(PHYSICIAN_ID);

    expect(found?.email).toBe("ana-repo@example.com");
    expect(found?.firstName).toBe("Ana");
  });
});
