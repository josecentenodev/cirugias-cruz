import { describe, expect, it } from "vitest";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { registerProcedureType } from "./register-procedure-type.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { procedureTypeRepository: new InMemoryProcedureTypeRepository() };
}

const validInput = {
  physicianId: PHYSICIAN_ID,
  id: "procedure-type-1",
  name: "Pterigión",
  defaultControlDefinitionId: "control-def-default-1",
};

describe("registerProcedureType", () => {
  it("registers the procedure type in the acting physician's tenant and persists it", async () => {
    const deps = buildDeps();

    const output = await registerProcedureType(deps)(validInput);

    expect(output).toEqual({ procedureTypeId: "procedure-type-1" });
    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.name).toBe("Pterigión");
  });

  it("seeds a default uncapped control definition (ADR 0030) so it's never left without one", async () => {
    const deps = buildDeps();

    await registerProcedureType(deps)(validInput);

    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.controlDefinitions).toHaveLength(1);
    const [definition] = persisted?.controlDefinitions ?? [];
    expect(definition?.id).toBe("control-def-default-1");
    expect(definition?.occurrenceRule).toEqual({ mode: "uncapped" });
  });

  it("accepts an optional description", async () => {
    const deps = buildDeps();

    await registerProcedureType(deps)({
      ...validInput,
      description: "Crecimiento fibrovascular conjuntival",
    });

    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.description).toBe("Crecimiento fibrovascular conjuntival");
  });

  it("lets the domain reject registration without a name", async () => {
    const deps = buildDeps();

    await expect(registerProcedureType(deps)({ ...validInput, name: "" })).rejects.toThrow();
  });
});
