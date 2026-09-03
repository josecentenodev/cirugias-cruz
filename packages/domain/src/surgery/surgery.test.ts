import { describe, expect, it } from "vitest";
import { Surgery } from "./surgery.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

const validAttributes = {
  id: "surgery-1",
  physicianId: PHYSICIAN_ID,
  patientId: "patient-1",
  procedureTypeId: "procedure-type-1",
  performedAt: new Date("2026-01-10"),
};

function createSurgery() {
  return Surgery.create(validAttributes);
}

describe("Surgery", () => {
  it("belongs to exactly one patient and one procedure type", () => {
    const surgery = createSurgery();

    expect(surgery.patientId).toBe("patient-1");
    expect(surgery.procedureTypeId).toBe("procedure-type-1");
  });

  it("cannot be created without a patient", () => {
    expect(() => Surgery.create({ ...validAttributes, patientId: "" })).toThrow();
  });

  it("cannot be created without a procedure type", () => {
    expect(() => Surgery.create({ ...validAttributes, procedureTypeId: "" })).toThrow();
  });

  it("is always in the DONE state", () => {
    const surgery = createSurgery();

    expect(surgery.state).toBe("DONE");
  });

  it("may exist with zero controls", () => {
    const surgery = createSurgery();

    expect(surgery.controls).toHaveLength(0);
  });

  it("allows the owning physician to record a control directly", () => {
    const surgery = createSurgery();

    const control = surgery.recordControl({
      id: "control-1",
      observations: "Sin signos de infección",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });

    expect(surgery.controls).toHaveLength(1);
    expect(control.observations).toBe("Sin signos de infección");
  });

  it("rejects a control authored by a physician from another tenant", () => {
    const surgery = createSurgery();

    expect(() =>
      surgery.recordControl({
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "physician", physicianId: OTHER_PHYSICIAN_ID },
      }),
    ).toThrow();
  });

  it("requires a control to have observations, a date/time and an author", () => {
    const surgery = createSurgery();

    expect(() =>
      surgery.recordControl({
        id: "control-1",
        observations: "",
        recordedAt: new Date(),
        author: { type: "physician", physicianId: PHYSICIAN_ID },
      }),
    ).toThrow();

    expect(() =>
      surgery.recordControl({
        id: "control-2",
        observations: "obs",
        recordedAt: undefined as unknown as Date,
        author: { type: "physician", physicianId: PHYSICIAN_ID },
      }),
    ).toThrow();
  });

  it("rejects a control authored by a resident who is not participating in this surgery", () => {
    const surgery = createSurgery();

    expect(() =>
      surgery.recordControl({
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "resident", residentId: "resident-1" },
      }),
    ).toThrow();
  });

  it("allows a control authored by a resident once they participate in this specific surgery", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);

    const control = surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(control.author).toEqual({ type: "resident", residentId: "resident-1" });
  });

  it("assignment means participation immediately, even before any control is recorded", () => {
    const surgery = createSurgery();

    surgery.assignResident("resident-1", PHYSICIAN_ID);

    expect(surgery.participatingResidentIds).toContain("resident-1");
  });

  it("a resident can be assigned to and participate in multiple surgeries", () => {
    const surgeryA = Surgery.create({ ...validAttributes, id: "surgery-a" });
    const surgeryB = Surgery.create({ ...validAttributes, id: "surgery-b" });

    surgeryA.assignResident("resident-1", PHYSICIAN_ID);
    surgeryB.assignResident("resident-1", PHYSICIAN_ID);

    expect(surgeryA.participatingResidentIds).toContain("resident-1");
    expect(surgeryB.participatingResidentIds).toContain("resident-1");
  });

  it("only the owning physician may add a participating resident", () => {
    const surgery = createSurgery();

    expect(() => surgery.assignResident("resident-1", OTHER_PHYSICIAN_ID)).toThrow();
  });

  it("resident participation is specific to a surgery: participating in one does not imply participation in another", () => {
    const surgeryA = Surgery.create({ ...validAttributes, id: "surgery-a" });
    const surgeryB = Surgery.create({ ...validAttributes, id: "surgery-b" });

    surgeryA.assignResident("resident-1", PHYSICIAN_ID);
    surgeryA.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(surgeryA.hasResidentParticipated("resident-1")).toBe(true);
    expect(surgeryB.hasResidentParticipated("resident-1")).toBe(false);
    expect(() =>
      surgeryB.recordControl({
        id: "control-2",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "resident", residentId: "resident-1" },
      }),
    ).toThrow();
  });

  it("preserves a resident's participation: cannot remove them once they have recorded a control", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(() => surgery.removeResident("resident-1", PHYSICIAN_ID)).toThrow();
  });

  it("allows removing a participating resident who has not recorded any control yet", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);

    surgery.removeResident("resident-1", PHYSICIAN_ID);

    expect(surgery.participatingResidentIds).not.toContain("resident-1");
  });

  it("only the owning physician may modify the surgery", () => {
    const surgery = createSurgery();

    expect(() =>
      surgery.modify({ performedAt: new Date("2026-02-01") }, OTHER_PHYSICIAN_ID),
    ).toThrow();

    surgery.modify({ performedAt: new Date("2026-02-01") }, PHYSICIAN_ID);
    expect(surgery.performedAt).toEqual(new Date("2026-02-01"));
  });

  it("only the owning physician may delete the surgery", () => {
    const surgery = createSurgery();

    expect(() => surgery.assertCanBeDeletedBy(OTHER_PHYSICIAN_ID)).toThrow();
    expect(() => surgery.assertCanBeDeletedBy(PHYSICIAN_ID)).not.toThrow();
  });

  it("the owning physician may modify any control, regardless of who authored it", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(() =>
      surgery.modifyControl(
        "control-1",
        { observations: "updated" },
        { type: "physician", physicianId: OTHER_PHYSICIAN_ID },
      ),
    ).toThrow();

    surgery.modifyControl(
      "control-1",
      { observations: "updated" },
      { type: "physician", physicianId: PHYSICIAN_ID },
    );
    expect(surgery.controls[0]?.observations).toBe("updated");
  });

  it("a resident may modify a control they themselves authored (ADR 0017)", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    surgery.modifyControl(
      "control-1",
      { observations: "updated by author" },
      { type: "resident", residentId: "resident-1" },
    );

    expect(surgery.controls[0]?.observations).toBe("updated by author");
  });

  it("a resident may not modify a control authored by another resident", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.assignResident("resident-2", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(() =>
      surgery.modifyControl(
        "control-1",
        { observations: "updated" },
        { type: "resident", residentId: "resident-2" },
      ),
    ).toThrow();
  });

  it("a resident may not modify a control authored by the physician", () => {
    const surgery = createSurgery();
    surgery.assignResident("resident-1", PHYSICIAN_ID);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });

    expect(() =>
      surgery.modifyControl(
        "control-1",
        { observations: "updated" },
        { type: "resident", residentId: "resident-1" },
      ),
    ).toThrow();
  });

  it("reconstitutes a surgery with its existing controls and participating residents, without re-running creation checks", () => {
    const surgery = Surgery.reconstitute({
      ...validAttributes,
      controls: [
        {
          id: "control-1",
          observations: "obs",
          recordedAt: new Date("2026-01-11"),
          author: { type: "resident", residentId: "resident-1" },
        },
      ],
      participatingResidentIds: ["resident-1"],
    });

    expect(surgery.controls).toHaveLength(1);
    expect(surgery.controls[0]?.id).toBe("control-1");
    expect(surgery.participatingResidentIds).toContain("resident-1");

    // Reconstituted state behaves exactly like state built through the
    // normal domain methods: the participation-preservation invariant
    // still applies to residents present at hydration time.
    expect(() => surgery.removeResident("resident-1", PHYSICIAN_ID)).toThrow();
  });

  it("only the owning physician may delete a control", () => {
    const surgery = createSurgery();
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "physician", physicianId: PHYSICIAN_ID },
    });

    expect(() => surgery.deleteControl("control-1", OTHER_PHYSICIAN_ID)).toThrow();

    surgery.deleteControl("control-1", PHYSICIAN_ID);
    expect(surgery.controls).toHaveLength(0);
  });
});
