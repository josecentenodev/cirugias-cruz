import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { reopenResearchStudy } from "./reopen-research-study.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedCompletedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  study.moveToInProgress(PHYSICIAN_ID);
  study.complete(PHYSICIAN_ID);
  repo.seed(study);
  return study;
}

describe("reopenResearchStudy", () => {
  it("reopens a COMPLETED study back to IN_PROGRESS and persists it", async () => {
    const deps = buildDeps();
    seedCompletedStudy(deps.researchStudyRepository);

    const output = await reopenResearchStudy(deps)({
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
      reopenResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject reopening a study that isn't COMPLETED", async () => {
    const deps = buildDeps();
    const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
    deps.researchStudyRepository.seed(study);

    await expect(
      reopenResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
      }),
    ).rejects.toThrow();
  });
});
