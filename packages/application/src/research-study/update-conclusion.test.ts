import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { updateConclusion } from "./update-conclusion.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  repo.seed(study);
  return study;
}

describe("updateConclusion", () => {
  it("updates the conclusion and persists the study", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await updateConclusion(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      conclusion: "New conclusion",
    });

    expect(output).toEqual({ researchStudyId: "study-1", conclusion: "New conclusion" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.conclusion).toBe("New conclusion");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      updateConclusion(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        conclusion: "C",
      }),
    ).rejects.toThrow(/was not found/);
  });
});
