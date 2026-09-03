import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { getSurgeryForResident } from "./get-surgery-for-resident.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { surgeryRepository: new InMemorySurgeryRepository() };
}

describe("getSurgeryForResident", () => {
  it("returns the surgery, including every control on it, when the resident participates", async () => {
    const deps = buildDeps();
    const surgery = Surgery.create({
      id: "surgery-1",
      physicianId: PHYSICIAN_ID,
      patientId: "patient-1",
      procedureTypeId: "procedure-type-1",
      performedAt: new Date("2026-01-10"),
    });
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });
    deps.surgeryRepository.seed(surgery);

    const result = await getSurgeryForResident(deps)({
      residentId: "resident-1",
      surgeryId: "surgery-1",
    });

    expect(result.id).toBe("surgery-1");
    expect(result.controls).toHaveLength(1);
  });

  it("returns not-found for a surgery the resident does not participate in", async () => {
    const deps = buildDeps();
    const surgery = Surgery.create({
      id: "surgery-1",
      physicianId: PHYSICIAN_ID,
      patientId: "patient-1",
      procedureTypeId: "procedure-type-1",
      performedAt: new Date("2026-01-10"),
    });
    deps.surgeryRepository.seed(surgery);

    await expect(
      getSurgeryForResident(deps)({ residentId: "resident-1", surgeryId: "surgery-1" }),
    ).rejects.toThrow(/was not found/);
  });

  it("returns not-found for an unknown surgery", async () => {
    const deps = buildDeps();

    await expect(
      getSurgeryForResident(deps)({ residentId: "resident-1", surgeryId: "missing" }),
    ).rejects.toThrow(/was not found/);
  });
});
