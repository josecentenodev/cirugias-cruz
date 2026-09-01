import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { moveResearchStudyToInProgress } from "./move-research-study-to-in-progress.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  repo.seed(study);
  return study;
}

describe("moveResearchStudyToInProgress", () => {
  it("moves a DRAFT study to IN_PROGRESS and persists it", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await moveResearchStudyToInProgress(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
    });

    expect(output).toEqual({ researchStudyId: "study-1", status: "IN_PROGRESS" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.status).toBe("IN_PROGRESS");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      moveResearchStudyToInProgress(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject moving a study that isn't DRAFT", async () => {
    const deps = buildDeps();
    const study = seedStudy(deps.researchStudyRepository);
    study.moveToInProgress(PHYSICIAN_ID);

    await expect(
      moveResearchStudyToInProgress(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
      }),
    ).rejects.toThrow();
  });
});
