import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { updateAnalysis } from "./update-analysis.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  repo.seed(study);
  return study;
}

describe("updateAnalysis", () => {
  it("updates the analysis and persists the study", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await updateAnalysis(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      analysis: "New analysis",
    });

    expect(output).toEqual({ researchStudyId: "study-1", analysis: "New analysis" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.analysis).toBe("New analysis");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      updateAnalysis(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        analysis: "A",
      }),
    ).rejects.toThrow(/was not found/);
  });
});
