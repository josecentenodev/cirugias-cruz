import { describe, expect, it } from "vitest";
import { ProcedureType } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { getProcedureType } from "./get-procedure-type.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildProcedureType(id: string, physicianId: string): ProcedureType {
  return ProcedureType.create({ id, physicianId, name: "Pterigión" });
}

describe("getProcedureType", () => {
  it("returns the procedure type when it belongs to the acting physician", async () => {
    const procedureTypeRepository = new InMemoryProcedureTypeRepository();
    procedureTypeRepository.seed(buildProcedureType("pt-1", PHYSICIAN_ID));

    const result = await getProcedureType({ procedureTypeRepository })({
      physicianId: PHYSICIAN_ID,
      procedureTypeId: "pt-1",
    });

    expect(result.id).toBe("pt-1");
  });

  it("throws NotFoundError when the procedure type does not exist", async () => {
    const procedureTypeRepository = new InMemoryProcedureTypeRepository();

    await expect(
      getProcedureType({ procedureTypeRepository })({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "does-not-exist",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for another physician's procedure type", async () => {
    const procedureTypeRepository = new InMemoryProcedureTypeRepository();
    procedureTypeRepository.seed(buildProcedureType("pt-1", OTHER_PHYSICIAN_ID));

    await expect(
      getProcedureType({ procedureTypeRepository })({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
