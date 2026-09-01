import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { deleteResearchStudy } from "./delete-research-study.js";

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

describe("deleteResearchStudy", () => {
  it("deletes a DRAFT study", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    const output = await deleteResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
    });

    expect(output).toEqual({ researchStudyId: "study-1" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted).toBeNull();
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      deleteResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject a physician outside the tenant", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    await expect(
      deleteResearchStudy(deps)({
        physicianId: OTHER_PHYSICIAN_ID,
        researchStudyId: "study-1",
      }),
    ).rejects.toThrow();
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted).not.toBeNull();
  });

  it("lets the domain reject deleting a study that isn't DRAFT", async () => {
    const deps = buildDeps();
    const study = seedStudy(deps.researchStudyRepository);
    study.moveToInProgress(PHYSICIAN_ID);

    await expect(
      deleteResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
      }),
    ).rejects.toThrow();
  });
});
