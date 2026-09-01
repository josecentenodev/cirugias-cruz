import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ResearchStudy } from "@cirugias-cruz/domain";
import {
  cleanupPhysician,
  cleanupResearchStudy,
  seedPhysician,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaResearchStudyRepository } from "./prisma-research-study-repository.js";

const PHYSICIAN_ID = "infra-test-m6-physician";
const STUDY_ID = "infra-test-m6-study-1";
const OTHER_STUDY_ID = "infra-test-m6-study-2";

describe("PrismaResearchStudyRepository", () => {
  const repository = new PrismaResearchStudyRepository(testPrisma);

  beforeAll(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupResearchStudy(STUDY_ID);
    await cleanupResearchStudy(OTHER_STUDY_ID);
  });

  afterAll(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when the research study does not exist", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("saves a DRAFT study with no surgeries and finds it back", async () => {
    const study = ResearchStudy.create({
      id: STUDY_ID,
      physicianId: PHYSICIAN_ID,
      hypothesis: "H",
    });

    await repository.save(study);
    const found = await repository.findById(STUDY_ID);

    expect(found).not.toBeNull();
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.status).toBe("DRAFT");
    expect(found?.hypothesis).toBe("H");
    expect(found?.surgeryIds).toHaveLength(0);
  });

  it("persists the surgeryIds Set and reconstructs it as a working universe", async () => {
    const study = ResearchStudy.create({ id: STUDY_ID, physicianId: PHYSICIAN_ID });
    study.addSurgery({ id: "infra-test-m6-surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    study.addSurgery({ id: "infra-test-m6-surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);

    await repository.save(study);
    const found = await repository.findById(STUDY_ID);

    expect(found?.surgeryIds).toEqual(
      expect.arrayContaining(["infra-test-m6-surgery-1", "infra-test-m6-surgery-2"]),
    );
    expect(found?.surgeryIds).toHaveLength(2);

    // The reconstructed instance still enforces real Domain invariants —
    // not just a flat copy of ids.
    found?.removeSurgery("infra-test-m6-surgery-1", PHYSICIAN_ID);
    expect(found?.surgeryIds).toEqual(["infra-test-m6-surgery-2"]);
  });

  it("replaces the whole surgeryIds set on save, rather than accumulating rows", async () => {
    const study = ResearchStudy.create({ id: STUDY_ID, physicianId: PHYSICIAN_ID });
    study.addSurgery({ id: "infra-test-m6-surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    await repository.save(study);

    const loaded = await repository.findById(STUDY_ID);
    loaded?.removeSurgery("infra-test-m6-surgery-1", PHYSICIAN_ID);
    loaded?.addSurgery({ id: "infra-test-m6-surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    await repository.save(loaded as ResearchStudy);

    const reloaded = await repository.findById(STUDY_ID);
    expect(reloaded?.surgeryIds).toEqual(["infra-test-m6-surgery-2"]);

    const rowCount = await testPrisma.researchStudySurgery.count({
      where: { researchStudyId: STUDY_ID },
    });
    expect(rowCount).toBe(1);
  });

  it("persists and reconstructs status transitions, including COMPLETED and a reopen back to IN_PROGRESS", async () => {
    const study = ResearchStudy.create({ id: STUDY_ID, physicianId: PHYSICIAN_ID });
    study.moveToInProgress(PHYSICIAN_ID);
    study.complete(PHYSICIAN_ID);
    await repository.save(study);

    const found = await repository.findById(STUDY_ID);
    expect(found?.status).toBe("COMPLETED");
    // A reconstructed COMPLETED study still enforces the real invariant —
    // no text edits allowed.
    expect(() => found?.updateHypothesis("H", PHYSICIAN_ID)).toThrow();

    found?.reopen(PHYSICIAN_ID);
    await repository.save(found as ResearchStudy);

    const reloaded = await repository.findById(STUDY_ID);
    expect(reloaded?.status).toBe("IN_PROGRESS");
  });

  it("findByPhysicianId returns only that physician's studies", async () => {
    const study = ResearchStudy.create({ id: STUDY_ID, physicianId: PHYSICIAN_ID });
    const other = ResearchStudy.create({ id: OTHER_STUDY_ID, physicianId: PHYSICIAN_ID });
    await repository.save(study);
    await repository.save(other);

    const found = await repository.findByPhysicianId(PHYSICIAN_ID);

    expect(found.map((s) => s.id)).toEqual(expect.arrayContaining([STUDY_ID, OTHER_STUDY_ID]));
  });

  it("delete removes the study and its surgery bridge rows", async () => {
    const study = ResearchStudy.create({ id: STUDY_ID, physicianId: PHYSICIAN_ID });
    study.addSurgery({ id: "infra-test-m6-surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    await repository.save(study);

    await repository.delete(STUDY_ID);

    await expect(repository.findById(STUDY_ID)).resolves.toBeNull();
    const bridgeRowCount = await testPrisma.researchStudySurgery.count({
      where: { researchStudyId: STUDY_ID },
    });
    expect(bridgeRowCount).toBe(0);
  });
});
