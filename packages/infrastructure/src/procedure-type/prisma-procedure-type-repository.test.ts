import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ProcedureType } from "@cirugias-cruz/domain";
import {
  cleanupPhysician,
  cleanupProcedureType,
  seedPhysician,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaProcedureTypeRepository } from "./prisma-procedure-type-repository.js";

const PHYSICIAN_ID = "infra-test-physician-procedure-type";

describe("PrismaProcedureTypeRepository", () => {
  const repository = new PrismaProcedureTypeRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupProcedureType("infra-test-procedure-type-1");
  });

  afterAll(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when the procedure type does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a procedure type and finds it back with identical field values", async () => {
    const procedureType = ProcedureType.create({
      id: "infra-test-procedure-type-1",
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
      description: "Extirpación de pterigión",
      technique: "Conjunctival autograft",
    });

    await repository.save(procedureType);
    const found = await repository.findById("infra-test-procedure-type-1");

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Pterigión");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.technique).toBe("Conjunctival autograft");
  });

  it("updates an existing procedure type on a second save rather than duplicating it", async () => {
    const procedureType = ProcedureType.create({
      id: "infra-test-procedure-type-1",
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
    });
    await repository.save(procedureType);

    procedureType.modify({ technique: "Amniotic membrane" }, PHYSICIAN_ID);
    await repository.save(procedureType);

    const found = await repository.findById("infra-test-procedure-type-1");
    expect(found?.technique).toBe("Amniotic membrane");

    const rowCount = await testPrisma.procedureType.count({
      where: { id: "infra-test-procedure-type-1" },
    });
    expect(rowCount).toBe(1);
  });
});
