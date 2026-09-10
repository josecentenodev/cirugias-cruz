import { describe, expect, it } from "vitest";
import { ProcedureType, Surgery } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import { InMemoryProcedureTypeRepository, InMemorySurgeryRepository } from "../testing/fakes.js";
import { getSurgery } from "./get-surgery.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildSurgery(id: string, physicianId: string): Surgery {
  return Surgery.create({
    id,
    physicianId,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
}

function buildDeps() {
  const surgeryRepository = new InMemorySurgeryRepository();
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  procedureTypeRepository.seed(
    ProcedureType.reconstitute({
      id: "procedure-type-1",
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
      customFields: [],
      controlDefinitions: [
        {
          id: "def-pain",
          name: "Pain scale",
          occurrenceRule: { mode: "capped", count: 4, period: { every: 24, unit: "hours" } },
        },
      ],
    }),
  );
  return { surgeryRepository, procedureTypeRepository };
}

describe("getSurgery", () => {
  it("returns the surgery when it belongs to the acting physician", async () => {
    const deps = buildDeps();
    deps.surgeryRepository.seed(buildSurgery("surgery-1", PHYSICIAN_ID));

    const result = await getSurgery(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
    });

    expect(result.surgery.id).toBe("surgery-1");
  });

  it("computes the capped-control follow-up projection", async () => {
    const deps = buildDeps();
    const surgery = buildSurgery("surgery-1", PHYSICIAN_ID);
    surgery.recordControl(
      {
        id: "control-1",
        recordedAt: new Date("2026-01-11"),
        author: { type: "physician", physicianId: PHYSICIAN_ID },
        definitionId: "def-pain",
      },
      { definitionId: "def-pain", count: 4 },
    );
    deps.surgeryRepository.seed(surgery);

    const result = await getSurgery(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
    });

    expect(result.followUp).toHaveLength(1);
    expect(result.followUp[0]).toMatchObject({
      definitionId: "def-pain",
      recorded: 1,
      expected: 4,
    });
    // performedAt 2026-01-10 + (1 + 1) * 24h
    expect(result.followUp[0]?.nextDueAt).toEqual(new Date("2026-01-12T00:00:00.000Z"));
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const deps = buildDeps();

    await expect(
      getSurgery(deps)({ physicianId: PHYSICIAN_ID, surgeryId: "does-not-exist" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for another physician's surgery", async () => {
    const deps = buildDeps();
    deps.surgeryRepository.seed(buildSurgery("surgery-1", OTHER_PHYSICIAN_ID));

    await expect(
      getSurgery(deps)({ physicianId: PHYSICIAN_ID, surgeryId: "surgery-1" }),
    ).rejects.toThrow(NotFoundError);
  });
});
