import { describe, expect, it } from "vitest";
import { ProcedureType } from "@cirugias-cruz/domain";
import { InMemoryProcedureTypeRepository } from "../testing/fakes.js";
import { addCustomField } from "./add-custom-field.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  procedureTypeRepository.seed(
    ProcedureType.create({ id: "procedure-type-1", physicianId: PHYSICIAN_ID, name: "Pterigión" }),
  );
  return { procedureTypeRepository };
}

const validInput = {
  physicianId: PHYSICIAN_ID,
  procedureTypeId: "procedure-type-1",
  id: "cf-1",
  name: "Pain (EVA)",
  unit: "0-10",
  magnitude: "pain",
  scope: "CONTROL" as const,
  constraint: { valueType: "NUMBER" as const, min: 0, max: 10 },
};

describe("addCustomField", () => {
  it("defines a new CustomField on the procedure type and persists it", async () => {
    const deps = buildDeps();

    const output = await addCustomField(deps)(validInput);

    expect(output).toEqual({ procedureTypeId: "procedure-type-1", customFieldId: "cf-1" });
    const persisted = await deps.procedureTypeRepository.findById("procedure-type-1");
    expect(persisted?.customFields).toHaveLength(1);
    expect(persisted?.customFields[0]?.name).toBe("Pain (EVA)");
  });

  it("throws NotFoundError when the procedure type does not exist", async () => {
    const deps = buildDeps();

    await expect(
      addCustomField(deps)({ ...validInput, procedureTypeId: "missing" }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject a physician from another tenant", async () => {
    const deps = buildDeps();

    await expect(
      addCustomField(deps)({ ...validInput, physicianId: OTHER_PHYSICIAN_ID }),
    ).rejects.toThrow();
  });

  it("lets the domain reject a duplicate field name on the same procedure type", async () => {
    const deps = buildDeps();
    await addCustomField(deps)(validInput);

    await expect(addCustomField(deps)({ ...validInput, id: "cf-2" })).rejects.toThrow();
  });
});
