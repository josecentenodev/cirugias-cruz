import { describe, expect, it } from "vitest";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { registerProcedureType } from "./register-procedure-type.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { procedureTypeRepository: new InMemoryProcedureTypeRepository() };
}

describe("registerProcedureType", () => {
  it("registers the procedure type in the acting physician's tenant and persists it", async () => {
    const deps = buildDeps();

    const output = await registerProcedureType(deps)({
      physicianId: PHYSICIAN_ID,
      id: "procedure-type-1",
      name: "Pterigión",
    });

    expect(output).toEqual({ procedureTypeId: "procedure-type-1" });
    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.name).toBe("Pterigión");
  });

  it("accepts optional description and technique", async () => {
    const deps = buildDeps();

    await registerProcedureType(deps)({
      physicianId: PHYSICIAN_ID,
      id: "procedure-type-1",
      name: "Pterigión",
      description: "Crecimiento fibrovascular conjuntival",
      technique: "conjunctival autograft",
    });

    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.description).toBe("Crecimiento fibrovascular conjuntival");
    expect(persisted?.technique).toBe("conjunctival autograft");
  });

  it("lets the domain reject registration without a name", async () => {
    const deps = buildDeps();

    await expect(
      registerProcedureType(deps)({ physicianId: PHYSICIAN_ID, id: "procedure-type-1", name: "" }),
    ).rejects.toThrow();
  });
});
