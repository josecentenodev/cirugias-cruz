import { describe, expect, it } from "vitest";
import { ResearchStudy, Surgery } from "@cirugias-cruz/domain";
import { InMemoryResearchStudyRepository, InMemorySurgeryRepository } from "../testing/fakes.js";
import { addSurgeryToResearchStudy } from "./add-surgery-to-research-study.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  const researchStudyRepository = new InMemoryResearchStudyRepository();
  const surgeryRepository = new InMemorySurgeryRepository();
  return { researchStudyRepository, surgeryRepository };
}

function seedStudy(researchStudyRepository: InMemoryResearchStudyRepository) {
  const study = ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
  researchStudyRepository.seed(study);
  return study;
}

function seedSurgery(surgeryRepository: InMemorySurgeryRepository, physicianId = PHYSICIAN_ID) {
  const surgery = Surgery.create({
    id: "surgery-1",
    physicianId,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
  surgeryRepository.seed(surgery);
  return surgery;
}

describe("addSurgeryToResearchStudy", () => {
  it("adds the surgery and persists the study, returning the updated universe", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);
    seedSurgery(deps.surgeryRepository);

    const output = await addSurgeryToResearchStudy(deps)({
      physicianId: PHYSICIAN_ID,
      researchStudyId: "study-1",
      surgeryId: "surgery-1",
    });

    expect(output).toEqual({
      researchStudyId: "study-1",
      surgeryIds: ["surgery-1"],
    });
    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.surgeryIds).toEqual(["surgery-1"]);
  });

  it("throws NotFoundError when the research study does not exist", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);

    await expect(
      addSurgeryToResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "missing-study",
        surgeryId: "surgery-1",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);

    await expect(
      addSurgeryToResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
        surgeryId: "missing-surgery",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("lets the domain reject a surgery belonging to a different tenant, using the surgery's real physicianId", async () => {
    const deps = buildDeps();
    seedStudy(deps.researchStudyRepository);
    seedSurgery(deps.surgeryRepository, OTHER_PHYSICIAN_ID);

    await expect(
      addSurgeryToResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
        surgeryId: "surgery-1",
      }),
    ).rejects.toThrow();

    const persisted = await deps.researchStudyRepository.findById("study-1");
    expect(persisted?.surgeryIds).toHaveLength(0);
  });

  it("lets the domain reject adding once the study is COMPLETED", async () => {
    const deps = buildDeps();
    const study = seedStudy(deps.researchStudyRepository);
    seedSurgery(deps.surgeryRepository);
    study.moveToInProgress(PHYSICIAN_ID);
    study.complete(PHYSICIAN_ID);

    await expect(
      addSurgeryToResearchStudy(deps)({
        physicianId: PHYSICIAN_ID,
        researchStudyId: "study-1",
        surgeryId: "surgery-1",
      }),
    ).rejects.toThrow();
  });
});
