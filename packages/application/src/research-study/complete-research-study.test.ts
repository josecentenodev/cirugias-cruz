import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { completeResearchStudy } from "./complete-research-study.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedInProgressStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  study.moveToInProgress(PHYSICIAN_ID);
  repo.seed(study);
  return study;
}

describe("completeResearchStudy", () => {
  it("completes an IN_PROGRESS study and persists it", async () => {
    const deps = buildDeps();
    seedInProgressStudy(deps.researchStudyRepository);

    const output = await completeResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
    });

    expect(output).toEqual({ researchStudyId: "study-1", status: "COMPLETED" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.status).toBe("COMPLETED");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      completeResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject completing a study that isn't IN_PROGRESS", async () => {
    const deps = buildDeps();
    const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
    deps.researchStudyRepository.seed(study);

    await expect(
      completeResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
      }),
    ).rejects.toThrow();
  });
});
