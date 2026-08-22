import { describe, expect, it } from "vitest";
import { Surgery } from "@cirugias-cruz/domain";
import { InMemorySurgeryRepository } from "../testing/fakes.js";
import { recordControl } from "./record-control.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  return { surgeryRepository: new InMemorySurgeryRepository() };
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

describe("recordControl", () => {
  it("records a physician-authored control and persists it", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);

    const output = await recordControl(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      id: "control-1",
      observations: "Sin signos de infección",
      recordedAt: new Date("2026-01-11"),
      author: { type: "physician" },
    });

    expect(output).toEqual({ surgeryId: "surgery-1", controlId: "control-1" });
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.controls).toHaveLength(1);
    expect(persisted?.controls[0]?.observations).toBe("Sin signos de infección");
  });

  it("records a resident-authored control once the resident is participating", async () => {
    const deps = buildDeps();
    const surgery = seedSurgery(deps.surgeryRepository);
    surgery.assignResident("resident-1", PHYSICIAN_ID);

    const output = await recordControl(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "resident", residentId: "resident-1" },
    });

    expect(output.controlId).toBe("control-1");
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.controls[0]?.author).toEqual({ type: "resident", residentId: "resident-1" });
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const deps = buildDeps();

    await expect(
      recordControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "missing-surgery",
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "physician" },
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects a caller acting on a surgery outside their own tenant, even with a resident author", async () => {
    const deps = buildDeps();
    const surgery = seedSurgery(deps.surgeryRepository, OTHER_PHYSICIAN_ID);
    surgery.assignResident("resident-1", OTHER_PHYSICIAN_ID);

    await expect(
      recordControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "resident", residentId: "resident-1" },
      }),
    ).rejects.toThrow(/own tenant/);
  });

  it("lets the domain reject a resident who is not participating in this surgery", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);

    await expect(
      recordControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "resident", residentId: "resident-1" },
      }),
    ).rejects.toThrow();
  });
});
