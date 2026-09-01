import { describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { listResearchStudies } from "./list-research-studies.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

describe("listResearchStudies", () => {
  it("lists only the acting physician's own studies", async () => {
    const deps = buildDeps();
    deps.researchStudyRepository.seed(
      ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID }),
    );
    deps.researchStudyRepository.seed(
      ResearchStudy.create({ id: "study-2", physicianId: OTHER_PHYSICIAN_ID }),
    );

    const output = await listResearchStudies(deps)({ physicianId: PHYSICIAN_ID });

    expect(output.researchStudies).toHaveLength(1);
    expect(output.researchStudies[0]?.id).toBe("study-1");
  });

  it("returns an empty list when the physician has no studies", async () => {
    const deps = buildDeps();

    const output = await listResearchStudies(deps)({ physicianId: PHYSICIAN_ID });

    expect(output.researchStudies).toEqual([]);
  });
});
