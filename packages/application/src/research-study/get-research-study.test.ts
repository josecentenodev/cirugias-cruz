import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { getResearchStudy } from "./get-research-study.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

describe("getResearchStudy", () => {
  it("returns the study's detail", async () => {
    const deps = buildDeps();
    deps.researchStudyRepository.seed(
      ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID, hypothesis: "H" }),
    );

    const output = await getResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
    });

    expect(output).toEqual({
      id: "study-1",
      status: "DRAFT",
      hypothesis: "H",
      results: undefined,
      analysis: undefined,
      conclusion: undefined,
      surgeryIds: [],
    });
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();

    await expect(
      getResearchStudy(deps)({ physicianId: PHYSICIAN_ID, researchStudyId: "missing-study" }),
    ).rejects.toThrow(/was not found/);
  });

  it("throws NotFoundError (not a permission error) for another tenant's study", async () => {
    const deps = buildDeps();
    deps.researchStudyRepository.seed(
      ResearchStudy.create({ id: "study-1", physicianId: OTHER_PHYSICIAN_ID }),
    );

    await expect(
      getResearchStudy(deps)({ physicianId: PHYSICIAN_ID, researchStudyId: "study-1" }),
    ).rejects.toThrow(/was not found/);
  });
});
