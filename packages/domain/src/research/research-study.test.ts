import { describe, expect, it } from "vitest";
import { ResearchStudy } from "./research-study.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function createStudy() {
  return ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
}

function createInProgressStudy() {
  const study = createStudy();
  study.moveToInProgress(PHYSICIAN_ID);
  return study;
}

function createCompletedStudy() {
  const study = createInProgressStudy();
  study.complete(PHYSICIAN_ID);
  return study;
}

describe("ResearchStudy", () => {
  it("belongs to exactly one physician (tenant) and starts in DRAFT", () => {
    const study = createStudy();

    expect(study.physicianId).toBe(PHYSICIAN_ID);
    expect(study.status).toBe("DRAFT");
    expect(study.surgeryIds).toHaveLength(0);
  });

  it("cannot be created without an owning physician (tenant)", () => {
    expect(() => ResearchStudy.create({ id: "study-1", physicianId: "" })).toThrow();
  });

  describe("DRAFT", () => {
    it("allows the physician to modify all text fields", () => {
      const study = createStudy();

      study.updateHypothesis("H", PHYSICIAN_ID);
      study.updateResults("R", PHYSICIAN_ID);
      study.updateAnalysis("A", PHYSICIAN_ID);
      study.updateConclusion("C", PHYSICIAN_ID);

      expect(study.hypothesis).toBe("H");
      expect(study.results).toBe("R");
      expect(study.analysis).toBe("A");
      expect(study.conclusion).toBe("C");
    });

    it("allows the physician to add and remove surgeries from multiple patients", () => {
      const study = createStudy();

      study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
      study.addSurgery({ id: "surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
      expect(study.surgeryIds).toEqual(["surgery-1", "surgery-2"]);

      study.removeSurgery("surgery-1", PHYSICIAN_ID);
      expect(study.surgeryIds).toEqual(["surgery-2"]);
    });

    it("does not require surgeries in the universe to share a procedure type", () => {
      const study = createStudy();

      expect(() =>
        study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
      ).not.toThrow();
      expect(() =>
        study.addSurgery({ id: "surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
      ).not.toThrow();
    });

    it("rejects a surgery belonging to a different tenant", () => {
      const study = createStudy();

      expect(() =>
        study.addSurgery({ id: "surgery-1", physicianId: OTHER_PHYSICIAN_ID }, PHYSICIAN_ID),
      ).toThrow();
    });

    it("only the owning physician may add or remove surgeries", () => {
      const study = createStudy();

      expect(() =>
        study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, OTHER_PHYSICIAN_ID),
      ).toThrow();

      study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
      expect(() => study.removeSurgery("surgery-1", OTHER_PHYSICIAN_ID)).toThrow();
    });

    it("can be deleted by its owning physician", () => {
      const study = createStudy();

      expect(() => study.assertCanBeDeletedBy(PHYSICIAN_ID)).not.toThrow();
    });

    it("cannot be deleted by a physician outside its tenant", () => {
      const study = createStudy();

      expect(() => study.assertCanBeDeletedBy(OTHER_PHYSICIAN_ID)).toThrow();
    });
  });

  describe("DRAFT -> IN_PROGRESS", () => {
    it("moves to IN_PROGRESS", () => {
      const study = createStudy();

      study.moveToInProgress(PHYSICIAN_ID);

      expect(study.status).toBe("IN_PROGRESS");
    });

    it("only the owning physician may move it to IN_PROGRESS", () => {
      const study = createStudy();

      expect(() => study.moveToInProgress(OTHER_PHYSICIAN_ID)).toThrow();
    });
  });

  describe("IN_PROGRESS", () => {
    it("allows the physician to modify all text fields", () => {
      const study = createInProgressStudy();

      expect(() => study.updateHypothesis("H", PHYSICIAN_ID)).not.toThrow();
      expect(() => study.updateResults("R", PHYSICIAN_ID)).not.toThrow();
      expect(() => study.updateAnalysis("A", PHYSICIAN_ID)).not.toThrow();
      expect(() => study.updateConclusion("C", PHYSICIAN_ID)).not.toThrow();
    });

    it("allows the physician to add and remove surgeries — the universe is not locked", () => {
      const study = createInProgressStudy();

      study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
      expect(study.surgeryIds).toEqual(["surgery-1"]);

      study.removeSurgery("surgery-1", PHYSICIAN_ID);
      expect(study.surgeryIds).toHaveLength(0);
    });

    it("cannot be deleted", () => {
      const study = createInProgressStudy();

      expect(() => study.assertCanBeDeletedBy(PHYSICIAN_ID)).toThrow();
    });
  });

  describe("IN_PROGRESS -> COMPLETED", () => {
    it("completes the study", () => {
      const study = createInProgressStudy();

      study.complete(PHYSICIAN_ID);

      expect(study.status).toBe("COMPLETED");
    });

    it("cannot be completed directly from DRAFT", () => {
      const study = createStudy();

      expect(() => study.complete(PHYSICIAN_ID)).toThrow();
    });

    it("only the owning physician may complete it", () => {
      const study = createInProgressStudy();

      expect(() => study.complete(OTHER_PHYSICIAN_ID)).toThrow();
    });
  });

  describe("COMPLETED", () => {
    it("cannot have its text fields modified", () => {
      const study = createCompletedStudy();

      expect(() => study.updateHypothesis("H", PHYSICIAN_ID)).toThrow();
      expect(() => study.updateResults("R", PHYSICIAN_ID)).toThrow();
      expect(() => study.updateAnalysis("A", PHYSICIAN_ID)).toThrow();
      expect(() => study.updateConclusion("C", PHYSICIAN_ID)).toThrow();
    });

    it("cannot have surgeries added or removed", () => {
      const study = createCompletedStudy();

      expect(() =>
        study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
      ).toThrow();
      expect(() => study.removeSurgery("surgery-1", PHYSICIAN_ID)).toThrow();
    });

    it("cannot be deleted", () => {
      const study = createCompletedStudy();

      expect(() => study.assertCanBeDeletedBy(PHYSICIAN_ID)).toThrow();
    });

    it("can be reopened back to IN_PROGRESS by its owning physician", () => {
      const study = createCompletedStudy();

      study.reopen(PHYSICIAN_ID);

      expect(study.status).toBe("IN_PROGRESS");
    });

    it("only the owning physician may reopen it", () => {
      const study = createCompletedStudy();

      expect(() => study.reopen(OTHER_PHYSICIAN_ID)).toThrow();
    });

    it("becomes fully modifiable again once reopened", () => {
      const study = createCompletedStudy();

      study.reopen(PHYSICIAN_ID);

      expect(() => study.updateConclusion("Updated conclusion", PHYSICIAN_ID)).not.toThrow();
      expect(() =>
        study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
      ).not.toThrow();
      expect(study.conclusion).toBe("Updated conclusion");
      expect(study.surgeryIds).toEqual(["surgery-1"]);
    });
  });

  it("cannot be reopened from DRAFT or IN_PROGRESS", () => {
    const draft = createStudy();
    expect(() => draft.reopen(PHYSICIAN_ID)).toThrow();

    const inProgress = createInProgressStudy();
    expect(() => inProgress.reopen(PHYSICIAN_ID)).toThrow();
  });
});
