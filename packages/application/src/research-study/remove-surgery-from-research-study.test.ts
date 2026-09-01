import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { removeSurgeryFromResearchStudy } from "./remove-surgery-from-research-study.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudyWithSurgery(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
  repo.seed(study);
  return study;
}

describe("removeSurgeryFromResearchStudy", () => {
  it("removes the surgery and persists the study, returning the updated universe", async () => {
    const deps = buildDeps();
    seedStudyWithSurgery(deps.researchStudyRepository);

    const output = await removeSurgeryFromResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      surgeryId: "surgery-1",
    });

    expect(output).toEqual({ researchStudyId: "study-1", surgeryIds: [] });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.surgeryIds).toEqual([]);
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      removeSurgeryFromResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        surgeryId: "surgery-1",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject removal once the study is COMPLETED", async () => {
    const deps = buildDeps();
    const study = seedStudyWithSurgery(deps.researchStudyRepository);
    study.moveToInProgress(PHYSICIAN_ID);
    study.complete(PHYSICIAN_ID);

    await expect(
      removeSurgeryFromResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
        surgeryId: "surgery-1",
      }),
    ).rejects.toThrow();
  });
});
