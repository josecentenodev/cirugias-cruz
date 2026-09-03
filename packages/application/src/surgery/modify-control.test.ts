import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { modifyControl } from "./modify-control.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return { surgeryRepository: new InMemorySurgeryRepository() };
}

function seedSurgeryWithControl(surgeryRepository: InMemorySurgeryRepository) {
  const surgery = Surgery.create({
    id: "surgery-1",
    physicianId: PHYSICIAN_ID,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
  surgery.assignResident("resident-1", PHYSICIAN_ID);
  surgery.assignResident("resident-2", PHYSICIAN_ID);
  surgery.recordControl({
    id: "control-1",
    observations: "obs",
    recordedAt: new Date("2026-01-11"),
    author: { type: "physician", physicianId: PHYSICIAN_ID },
  });
  surgery.recordControl({
    id: "control-2",
    observations: "obs",
    recordedAt: new Date("2026-01-11"),
    author: { type: "resident", residentId: "resident-1" },
  });
  surgeryRepository.seed(surgery);
  return surgery;
}

describe("modifyControl", () => {
  it("lets the physician modify the control and persists the surgery", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    const output = await modifyControl(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      controlId: "control-1",
      changes: { observations: "updated observations" },
      actor: { type: "physician" },
    });

    expect(output).toEqual({ surgeryId: "surgery-1", controlId: "control-1" });
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.controls[0]?.observations).toBe("updated observations");
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const deps = buildDeps();

    await expect(
      modifyControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "missing-surgery",
        controlId: "control-1",
        changes: { observations: "x" },
        actor: { type: "physician" },
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects a physician who does not own the surgery, before ever touching the domain object", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    await expect(
      modifyControl(deps)({
        physicianId: OTHER_PHYSICIAN_ID,
        surgeryId: "surgery-1",
        controlId: "control-1",
        changes: { observations: "x" },
        actor: { type: "physician" },
      }),
    ).rejects.toThrow();
  });

  it("lets the domain reject an unknown control id", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    await expect(
      modifyControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        controlId: "missing-control",
        changes: { observations: "x" },
        actor: { type: "physician" },
      }),
    ).rejects.toThrow();
  });

  it("lets a resident modify a control they themselves authored (ADR 0017)", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    await modifyControl(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      controlId: "control-2",
      changes: { observations: "updated by author" },
      actor: { type: "resident", residentId: "resident-1" },
    });

    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.controls[1]?.observations).toBe("updated by author");
  });

  it("rejects a resident modifying a control authored by another resident", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    await expect(
      modifyControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        controlId: "control-2",
        changes: { observations: "x" },
        actor: { type: "resident", residentId: "resident-2" },
      }),
    ).rejects.toThrow();
  });

  it("rejects a resident modifying a control authored by the physician", async () => {
    const deps = buildDeps();
    seedSurgeryWithControl(deps.surgeryRepository);

    await expect(
      modifyControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        controlId: "control-1",
        changes: { observations: "x" },
        actor: { type: "resident", residentId: "resident-1" },
      }),
    ).rejects.toThrow();
  });
});
