import { describe, expect, it } from "vitest";
import { InMemoryResearchStudyRepository } from "../testing/fakes.js";
import { createResearchStudy } from "./create-research-study.js";

const PHYSICIAN_ID = "physician-1";

function buildDeps() {
  return { researchStudyRepository: new InMemoryResearchStudyRepository() };
}

describe("createResearchStudy", () => {
  it("creates a study in the acting physician's tenant, starting in DRAFT", async () => {
    const deps = buildDeps();

    const output = await createResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      id: "study-1",
      hypothesis: "H",
    });

    expect(output).toEqual({ researchStudyId: "study-1" });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.physicianId).toBe(PHYSICIAN_ID);
    expect(persisted?.status).toBe("DRAFT");
    expect(persisted?.hypothesis).toBe("H");
  });

  it("lets the domain reject an empty physicianId", async () => {
    const deps = buildDeps();

    await expect(createResearchStudy(deps)({ physicianId: "", id: "study-1" })).rejects.toThrow();
  });
});
