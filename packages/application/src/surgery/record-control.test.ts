import { describe, expect, it } from "vitest";
import { CustomField, ProcedureType, Surgery } from "@cirugias-cruz/domain";
import { InMemoryProcedureTypeRepository, InMemorySurgeryRepository } from "../testing/fakes.js";
import { recordControl } from "./record-control.js";

const PHYSICIAN_ID = "physician-1";
const OTHER_PHYSICIAN_ID = "physician-2";

function buildDeps() {
  const procedureTypeRepository = new InMemoryProcedureTypeRepository();
  procedureTypeRepository.seed(
    ProcedureType.create({
      id: "procedure-type-1",
      physicianId: PHYSICIAN_ID,
      name: "Pterigión",
    }),
  );
  return { surgeryRepository: new InMemorySurgeryRepository(), procedureTypeRepository };
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

  it("accepts a CONTROL-scoped CustomField value matching the procedure type's definition", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);
    const procedureType = await deps.procedureTypeRepository.findById("procedure-type-1");
    procedureType?.addCustomField(
      CustomField.create({
        id: "cf-eva",
        name: "Pain (EVA)",
        unit: "0-10",
        magnitude: "pain",
        scope: "CONTROL",
        constraint: { valueType: "NUMBER", min: 0, max: 10 },
      }),
      PHYSICIAN_ID,
    );

    const output = await recordControl(deps)({
      physicianId: PHYSICIAN_ID,
      surgeryId: "surgery-1",
      id: "control-1",
      observations: "obs",
      recordedAt: new Date(),
      author: { type: "physician" },
      customFieldValues: [{ definitionId: "cf-eva", value: 3 }],
    });

    expect(output.controlId).toBe("control-1");
    const persisted = await deps.surgeryRepository.findById("surgery-1");
    expect(persisted?.controls[0]?.customFieldValues[0]?.value).toBe(3);
  });

  it("rejects a CustomField value outside its NUMBER constraint's range", async () => {
    const deps = buildDeps();
    seedSurgery(deps.surgeryRepository);
    const procedureType = await deps.procedureTypeRepository.findById("procedure-type-1");
    procedureType?.addCustomField(
      CustomField.create({
        id: "cf-eva",
        name: "Pain (EVA)",
        unit: "0-10",
        magnitude: "pain",
        scope: "CONTROL",
        constraint: { valueType: "NUMBER", min: 0, max: 10 },
      }),
      PHYSICIAN_ID,
    );

    await expect(
      recordControl(deps)({
        physicianId: PHYSICIAN_ID,
        surgeryId: "surgery-1",
        id: "control-1",
        observations: "obs",
        recordedAt: new Date(),
        author: { type: "physician" },
        customFieldValues: [{ definitionId: "cf-eva", value: 99 }],
      }),
    ).rejects.toThrow(/must be <=/);
  });
});
