import { describe, expect, it } from "vitest";
import type { OwnSurgeryDto } from "./queries";
import { toOwnSurgeryDetailView, toOwnSurgeryListView } from "./mappers";

const baseSurgery: OwnSurgeryDto = {
  id: "surgery-1",
  physicianId: "physician-1",
  patientId: "patient-1",
  procedureTypeId: "procedure-type-1",
  patientName: "Ana Gomez",
  procedureTypeName: "Pterigión",
  performedAt: "2026-01-10T00:00:00.000Z",
  state: "DONE",
  participatingResidentIds: ["resident-1"],
  controls: [
    {
      id: "control-1",
      observations: "By me",
      recordedAt: "2026-01-11T10:00:00.000Z",
      author: { type: "resident", residentId: "resident-1" },
    },
    {
      id: "control-2",
      observations: "By the physician",
      recordedAt: "2026-01-12T10:00:00.000Z",
      author: { type: "physician", physicianId: "physician-1" },
    },
    {
      id: "control-3",
      observations: "By another resident",
      recordedAt: "2026-01-13T10:00:00.000Z",
      author: { type: "resident", residentId: "resident-2" },
    },
  ],
};

describe("toOwnSurgeryListView", () => {
  it("shows patient/procedure type by name, as resolved server-side", () => {
    const view = toOwnSurgeryListView(baseSurgery);

    expect(view.patientName).toBe("Ana Gomez");
    expect(view.procedureTypeName).toBe("Pterigión");
    expect(view.controlCount).toBe(3);
  });
});

describe("toOwnSurgeryDetailView", () => {
  it("marks only the control authored by the given residentId as isMine", () => {
    const view = toOwnSurgeryDetailView(baseSurgery, "resident-1");

    const own = view.controls.find((c) => c.id === "control-1");
    const physicianAuthored = view.controls.find((c) => c.id === "control-2");
    const otherResident = view.controls.find((c) => c.id === "control-3");

    expect(own?.isMine).toBe(true);
    expect(own?.authorLabel).toBe("You");
    expect(physicianAuthored?.isMine).toBe(false);
    expect(physicianAuthored?.authorLabel).toBe("Physician");
    expect(otherResident?.isMine).toBe(false);
    expect(otherResident?.authorLabel).toBe("Another resident");
  });

  it("treats every control as not-mine when the own residentId is unavailable — the safe default", () => {
    const view = toOwnSurgeryDetailView(baseSurgery, null);

    expect(view.controls.every((c) => !c.isMine)).toBe(true);
  });

  it("sorts controls newest first", () => {
    const view = toOwnSurgeryDetailView(baseSurgery, "resident-1");

    expect(view.controls.map((c) => c.id)).toEqual(["control-3", "control-2", "control-1"]);
  });
});
