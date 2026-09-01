import { describe, expect, it } from "vitest";
import { ProcedureType } from "@cirugias-cruz/domain";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { listProcedureTypes } from "./list-procedure-types.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildProcedureType(id: string, physicianId: string): ProcedureType {
  return ProcedureType.create({ id, physicianId, name: "Pterigión" });
}

describe("listProcedureTypes", () => {
  it("returns only the acting physician's procedure types", async () => {
    const procedureTypeRepository = new InMemoryProcedureTypeRepository();
    procedureTypeRepository.seed(buildProcedureType("pt-1", PHYSICIAN_ID));
    procedureTypeRepository.seed(buildProcedureType("pt-2", OTHER_PHYSICIAN_ID));

    const result = await listProcedureTypes({ procedureTypeRepository })({
      physicianId: PHYSICIAN_ID,
    });

    expect(result.map((procedureType) => procedureType.id)).toEqual(["pt-1"]);
  });

  it("returns an empty array when the physician has no procedure types", async () => {
    const procedureTypeRepository = new InMemoryProcedureTypeRepository();

    const result = await listProcedureTypes({ procedureTypeRepository })({
      physicianId: PHYSICIAN_ID,
    });

    expect(result).toEqual([]);
  });
});
