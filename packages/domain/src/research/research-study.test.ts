import { describe, expect, it } from "vitest";
import { ResearchStudy } from "./research-study.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function createStudy() {
  return ResearchStudy.create({ id: "study-1", physicianId: PHYSICIAN_ID });
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

  it("allows the physician to add surgeries from multiple patients while in DRAFT", () => {
    const study = createStudy();

    study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    study.addSurgery({ id: "surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);

    expect(study.surgeryIds).toEqual(["surgery-1", "surgery-2"]);
  });

  it("does not require surgeries in the universe to share a procedure type", () => {
    // ResearchStudy only tracks surgery ids + their tenant; procedure type
    // is Surgery's concern and is never checked here — this test documents
    // that no such constraint exists.
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

  it("transitions to IN_PROGRESS once the hypothesis is confirmed", () => {
    const study = createStudy();
    study.updateHypothesis("Autograft reduces recurrence", PHYSICIAN_ID);

    study.confirmHypothesis(PHYSICIAN_ID);

    expect(study.status).toBe("IN_PROGRESS");
  });

  it("cannot confirm a hypothesis that has not been set", () => {
    const study = createStudy();

    expect(() => study.confirmHypothesis(PHYSICIAN_ID)).toThrow();
  });

  it("locks the surgery universe once IN_PROGRESS: surgeries cannot be added or removed", () => {
    const study = createStudy();
    study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    study.updateHypothesis("Autograft reduces recurrence", PHYSICIAN_ID);
    study.confirmHypothesis(PHYSICIAN_ID);

    expect(() =>
      study.addSurgery({ id: "surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
    ).toThrow();
    expect(() => study.removeSurgery("surgery-1", PHYSICIAN_ID)).toThrow();
  });

  it("transitions to COMPLETED once the conclusion is confirmed, keeping the universe locked", () => {
    const study = createStudy();
    study.addSurgery({ id: "surgery-1", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID);
    study.updateHypothesis("Autograft reduces recurrence", PHYSICIAN_ID);
    study.confirmHypothesis(PHYSICIAN_ID);
    study.updateConclusion("Recurrence rate was lower", PHYSICIAN_ID);

    study.confirmConclusion(PHYSICIAN_ID);

    expect(study.status).toBe("COMPLETED");
    expect(() =>
      study.addSurgery({ id: "surgery-2", physicianId: PHYSICIAN_ID }, PHYSICIAN_ID),
    ).toThrow();
  });

  it("remains editable (text fields) by the physician even after completion", () => {
    const study = createStudy();
    study.updateHypothesis("H", PHYSICIAN_ID);
    study.confirmHypothesis(PHYSICIAN_ID);
    study.updateConclusion("C", PHYSICIAN_ID);
    study.confirmConclusion(PHYSICIAN_ID);

    expect(() => study.updateResults("New results", PHYSICIAN_ID)).not.toThrow();
    expect(study.results).toBe("New results");
  });

  it("may only be deleted while in DRAFT", () => {
    const study = createStudy();
    study.updateHypothesis("H", PHYSICIAN_ID);

    expect(() => study.assertCanBeDeletedBy(PHYSICIAN_ID)).not.toThrow();

    study.confirmHypothesis(PHYSICIAN_ID);

    expect(() => study.assertCanBeDeletedBy(PHYSICIAN_ID)).toThrow();
  });

  it("cannot be deleted by a physician outside its tenant", () => {
    const study = createStudy();

    expect(() => study.assertCanBeDeletedBy(OTHER_PHYSICIAN_ID)).toThrow();
  });
});
