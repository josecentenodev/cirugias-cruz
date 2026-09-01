import { describe, expect, it } from "vitest";
import { Resident, Surgery } from "@cirugias-cruz/domain";
import { InMemoryResidentRepository, InMemorySurgeryRepository } from "../testing/fakes.js";
import { removeResidentFromSurgery } from "./remove-resident-from-surgery.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  const surgeryRepository = new InMemorySurgeryRepository();
  const residentRepository = new InMemoryResidentRepository();
  return { surgeryRepository, residentRepository };
}

function seedSurgery(surgeryRepository: InMemorySurgeryRepository, physicianId = PHYSICIAN_ID) {
  const surgery = Surgery.create({
    id: "surgery-1",
    physicianId,
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: new Date("2026-01-10"),
  });
  surgery.assignResident("resident-1", physicianId);
  surgeryRepository.seed(surgery);
  return surgery;
}

function seedResident(residentRepository: InMemoryResidentRepository, physicianId = PHYSICIAN_ID) {
  const resident = Resident.create({
    id: "resident-1",
    physicianId,
    firstName: "Laura",
    lastName: "Diaz",
    phone: "+54 11 3333-3333",
    email: "laura@example.com",
    dateOfBirth: new Date("1995-02-02"),
  });
  residentRepository.seed(resident);
  return resident;
}

describe("removeResidentFromSurgery", () => {
  it("removes the resident and persists the surgery, returning the updated roster", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);
    seedResident(deps.residentRepository);

    const output = await removeResidentFromSurgery(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      residentId: "resident-1",
    });

    expect(output).toEqual({ surgeryId: "surgery-1", participatingResidentIds: [] });
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.participatingResidentIds).not.toContain("resident-1");
  });

  it("rejects removal once the resident has recorded a control on this surgery", async () => {
    const deps = buildDeps();
    const surgery = seedSurgery(deps.surgeryRepository);
    seedResident(deps.residentRepository);
    surgery.recordControl({
      id: "control-1",
      observations: "obs",
      recordedAt: new Date("2026-01-11"),
      author: { type: "resident", residentId: "resident-1" },
    });

    await expect(
      removeResidentFromSurgery(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        residentId: "resident-1",
      }),
    ).rejects.toThrow(/participation.*preserved/);
  });

  it("throws NotFoundError when the surgery does not exist", async () => {
    const deps = buildDeps();
    seedResident(deps.residentRepository);

    await expect(
      removeResidentFromSurgery(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "missing-surgery",
        residentId: "resident-1",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("throws NotFoundError when the resident does not exist", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);

    await expect(
      removeResidentFromSurgery(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        residentId: "missing-resident",
      }),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects removing a resident who belongs to a different tenant than the physician", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);
    seedResident(deps.residentRepository, OTHER_PHYSICIAN_ID);

    await expect(
      removeResidentFromSurgery(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        residentId: "resident-1",
      }),
    ).rejects.toThrow(/own physician's tenant/);
  });

  it("lets the domain reject an acting physician who does not own the surgery", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository, OTHER_PHYSICIAN_ID);
    seedResident(deps.residentRepository, PHYSICIAN_ID);

    await expect(
      removeResidentFromSurgery(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        residentId: "resident-1",
      }),
    ).rejects.toThrow();
  });
});
