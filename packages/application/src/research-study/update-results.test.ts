import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { updateResults } from "./update-results.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  repo.seed(study);
  return study;
}

describe("updateResults", () => {
  it("updates the results and persists the study", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await updateResults(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      results: "New results",
    });

    expect(output).toEqual({ researchStudyId: "study-1", results: "New results" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.results).toBe("New results");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      updateResults(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        results: "R",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject updating once the study is COMPLETED", async () => {
    const deps = buildDeps();
    const study = seedStudy(deps.researchStudyRepository);
    study.moveToInProgress(PHYSICIAN_ID);
    study.complete(PHYSICIAN_ID);

    await expect(
      updateResults(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
        results: "R",
      }),
    ).rejects.toThrow();
  });
});
