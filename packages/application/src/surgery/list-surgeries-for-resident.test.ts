import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { listSurgeriesForResident } from "./list-surgeries-for-resident.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { surgeryRepository: new InMemorySurgeryRepository() };
}

function surgery(id: string) {
  return Surgery.create({
    id,
    physicianId: PHYSICIAN_ID,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
}

describe("listSurgeriesForResident", () => {
  it("returns only surgeries the resident participates in", async () => {
    const deps = buildDeps();
    const mine = surgery("surgery-mine");
    mine.assignResident("resident-1", PHYSICIAN_ID);
    const notMine = surgery("surgery-not-mine");
    deps.surgeryRepository.seed(mine);
    deps.surgeryRepository.seed(notMine);

    const result = await listSurgeriesForResident(deps)({ residentId: "resident-1" });

    expect(result.map((s) => s.id)).toEqual(["surgery-mine"]);
  });

  it("returns an empty list when the resident participates in nothing", async () => {
    const deps = buildDeps();
    deps.surgeryRepository.seed(surgery("surgery-1"));

    const result = await listSurgeriesForResident(deps)({ residentId: "resident-1" });

    expect(result).toEqual([]);
  });
});
