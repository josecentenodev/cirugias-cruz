import { describe, expect, it } from "vitest";
import { ProcedureType } from "@cirugias-cruz/domain";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { modifyProcedureType } from "./modify-procedure-type.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  procedureTypeRepository.seed(
    ProcedureType.create({ id: "procedure-type-1", physicianId: PHYSICIAN_ID, name: "Pterigión" }),
  );
  return { procedureTypeRepository };
}

describe("modifyProcedureType", () => {
  it("modifies the procedure type and persists the change", async () => {
    const deps = buildDeps();

    const output = await modifyProcedureType(deps)({
      physicianId: PHYSICIAN_ID,
      procedureTypeId: "procedure-type-1",
      technique: "conjunctival autograft",
    });

    expect(output).toEqual({ procedureTypeId: "procedure-type-1" });
    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.technique).toBe("conjunctival autograft");
  });

  it("throws NotFoundError when the procedure type does not exist", async () => {
    const deps = buildDeps();

    await expect(
      modifyProcedureType(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "missing",
        name: "New name",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject modification by a physician from another tenant", async () => {
    const deps = buildDeps();

    await expect(
      modifyProcedureType(deps)({
        physicianId: OTHER_PHYSICIAN_ID,
        procedureTypeId: "procedure-type-1",
        name: "Renamed",
      }),
    ).rejects.toThrow();
  });
});
