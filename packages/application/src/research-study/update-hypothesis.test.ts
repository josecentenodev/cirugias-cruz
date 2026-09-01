import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { updateHypothesis } from "./update-hypothesis.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

function seedStudy(repo: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  repo.seed(study);
  return study;
}

describe("updateHypothesis", () => {
  it("updates the hypothesis and persists the study", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await updateHypothesis(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      hypothesis: "New hypothesis",
    });

    expect(output).toEqual({ researchStudyId: "study-1", hypothesis: "New hypothesis" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.hypothesis).toBe("New hypothesis");
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      updateHypothesis(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        hypothesis: "H",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject a physician outside the tenant", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    await expect(
      updateHypothesis(deps)({
        physicianId: OTHER_PHYSICIAN_ID,
        researchStudyId: "study-1",
        hypothesis: "H",
      }),
    ).rejects.toThrow();
  });
});
