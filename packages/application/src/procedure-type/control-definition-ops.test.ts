import { describe, expect, it } from "vitest";
import { ProcedureType, Surgery } from "@cirugias-cruz/domain";
import { InMemoryProcedureTypeRepository, InMemorySurgeryRepository } from "../testing/fakes.js";
import { addControlDefinition } from "./add-control-definition.js";
import { editControlDefinition } from "./edit-control-definition.js";
import { removeControlDefinition } from "./remove-control-definition.js";
import { editCustomField } from "./edit-custom-field.js";
import { removeCustomField } from "./remove-custom-field.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  procedureTypeRepository.seed(
    ProcedureType.reconstitute({
      id: "pt-1",
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
      customFields: [
        {
          id: "cf-1",
          name: "Pain (EVA)",
          scope: "CONTROL",
          constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
        },
      ],
      controlDefinitions: [
        {
          id: "def-1",
          name: "Pain scale",
          occurrenceRule: { mode: "capped", count: 4, period: { every: 24, unit: "hours" } },
        },
      ],
    }),
  );
  return { procedureTypeRepository, surgeryRepository: new InMemorySurgeryRepository() };
}

function seedSurgeryWithControl(
  surgeryRepository: InMemorySurgeryRepository,
  opts: { definitionId?: string; customFieldValues?: { definitionId: string; value: number }[] },
) {
  const surgery = Surgery.reconstitute({
    id: "surgery-1",
    physicianId: PHYSICIAN_ID,
    patientId: "patient-1",
    procedureTypeId: "pt-1",
    performedAt: new Date("2026-01-10"),
    participatingResidentIds: [],
    controls: [
      {
        id: "control-1",
        recordedAt: new Date("2026-01-11"),
        author: { type: "physician", physicianId: PHYSICIAN_ID },
        definitionId: opts.definitionId,
        customFieldValues: opts.customFieldValues,
      },
    ],
  });
  surgeryRepository.seed(surgery);
}

describe("addControlDefinition", () => {
  it("adds a control definition and persists it", async () => {
    const deps = buildDeps();

    const output = await addControlDefinition(deps)({
      physicianId: PHYSICIAN_ID,
      procedureTypeId: "pt-1",
      id: "def-2",
      name: "Wound check",
      occurrenceRule: { mode: "uncapped" },
    });

    expect(output.controlDefinitionId).toBe("def-2");
    const persisted = await deps.procedureTypeRepository.findById("pt-1");
    expect(persisted?.controlDefinitions).toHaveLength(2);
  });

  it("rejects a duplicate name", async () => {
    const deps = buildDeps();
    await expect(
      addControlDefinition(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
        id: "def-2",
        name: "Pain scale",
        occurrenceRule: { mode: "uncapped" },
      }),
    ).rejects.toThrow();
  });
});

describe("editControlDefinition / removeControlDefinition freeze rule", () => {
  it("edits an unused control definition", async () => {
    const deps = buildDeps();

    await editControlDefinition(deps)({
      physicianId: PHYSICIAN_ID,
      procedureTypeId: "pt-1",
      controlDefinitionId: "def-1",
      changes: { name: "Pain scale (EVA)" },
    });

    const persisted = await deps.procedureTypeRepository.findById("pt-1");
    expect(persisted?.controlDefinitions[0]?.name).toBe("Pain scale (EVA)");
  });

  it("rejects editing a control definition once a Control references it", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository, { definitionId: "def-1" });

    await expect(
      editControlDefinition(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
        controlDefinitionId: "def-1",
        changes: { name: "nope" },
      }),
    ).rejects.toThrow(/recorded data/);
  });

  it("rejects removing a control definition once a Control references it", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository, { definitionId: "def-1" });

    await expect(
      removeControlDefinition(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
        controlDefinitionId: "def-1",
      }),
    ).rejects.toThrow(/recorded data/);
  });

  it("does not consider another tenant's Control as usage", async () => {
    const deps = buildDeps();
    const foreign = Surgery.reconstitute({
      id: "surgery-x",
      physicianId: "other-physician",
      patientId: "p",
      procedureTypeId: "pt-1",
      performedAt: new Date("2026-01-10"),
      participatingResidentIds: [],
      controls: [
        {
          id: "c-x",
          recordedAt: new Date("2026-01-11"),
          author: { type: "physician", physicianId: "other-physician" },
          definitionId: "def-1",
        },
      ],
    });
    deps.surgeryRepository.seed(foreign);

    await expect(
      removeControlDefinition(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
        controlDefinitionId: "def-1",
      }),
    ).resolves.toBeDefined();
  });
});

describe("editCustomField / removeCustomField freeze rule", () => {
  it("edits an unused CustomField", async () => {
    const deps = buildDeps();

    await editCustomField(deps)({
      physicianId: PHYSICIAN_ID,
      procedureTypeId: "pt-1",
      customFieldId: "cf-1",
      name: "Pain (0-10)",
      scope: "CONTROL",
      constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
    });

    const persisted = await deps.procedureTypeRepository.findById("pt-1");
    expect(persisted?.customFields[0]?.name).toBe("Pain (0-10)");
  });

  it("rejects editing / removing a CustomField once a value references it", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository, {
      customFieldValues: [{ definitionId: "cf-1", value: 3 }],
    });

    await expect(
      removeCustomField(deps)({
        physicianId: PHYSICIAN_ID,
        procedureTypeId: "pt-1",
        customFieldId: "cf-1",
      }),
    ).rejects.toThrow(/recorded data/);
  });
});
