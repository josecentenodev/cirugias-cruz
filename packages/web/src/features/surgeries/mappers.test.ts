import { describe, expect, it } from "vitest";
import { toControlView, toSurgeryDetailView, toSurgeryListView } from "./mappers.js";
import type { ControlDto, SurgeryDto } from "./dtos.js";

function buildSurgery(overrides: Partial<SurgeryDto> = {}): SurgeryDto {
  return {
    id: "surgery-1",
    physicianId: "physician-1",
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: "2026-01-15T00:00:00.000Z",
    state: "DONE",
    participatingResidentIds: [],
    controls: [],
    ...overrides,
  };
}

function buildControl(overrides: Partial<ControlDto> = {}): ControlDto {
  return {
    id: "control-1",
    observations: "Evolución favorable",
    recordedAt: "2026-01-16T14:30:00.000Z",
    author: { type: "physician", physicianId: "physician-1" },
    ...overrides,
  };
}

describe("toControlView", () => {
  it("labels a physician-authored control", () => {
    const view = toControlView(buildControl());
    expect(view.authorLabel).toBe("You (physician)");
  });

  it("labels a resident-authored control with a shortened residentId", () => {
    const view = toControlView(
      buildControl({ author: { type: "resident", residentId: "abcdef12-3456-7890" } }),
    );
    expect(view.authorLabel).toBe("Resident abcdef12");
  });

  it("formats recordedAt for both display and datetime-local input pre-fill, in the viewer's local time", () => {
    // Deliberately computed from the same local Date getters the mapper
    // itself uses (see toDatetimeLocalValue's own reasoning), not a
    // hardcoded UTC string — a `datetime-local` input carries no
    // timezone, so this must round-trip correctly regardless of which
    // timezone the test (or a real deployment) runs in.
    const recordedAt = "2026-01-16T14:30:00.000Z";
    const expected = new Date(recordedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const expectedLocalValue =
      `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}` +
      `T${pad(expected.getHours())}:${pad(expected.getMinutes())}`;

    const view = toControlView(buildControl({ recordedAt }));

    expect(view.recordedAtInputValue).toBe(expectedLocalValue);
    expect(view.recordedAtLabel).toContain("2026");
  });

  it("round-trips a datetime-local value unchanged: re-parsing it produces the same recordedAtInputValue", () => {
    // The concrete correctness property that matters: pre-filling the
    // edit form with recordedAtInputValue and resubmitting it unchanged
    // must not silently shift the Control's recorded time.
    const original = toControlView(buildControl({ recordedAt: "2026-01-16T14:30:00.000Z" }));
    const roundTripped = toControlView(
      buildControl({ recordedAt: new Date(original.recordedAtInputValue).toISOString() }),
    );
    expect(roundTripped.recordedAtInputValue).toBe(original.recordedAtInputValue);
  });
});

describe("toSurgeryListView", () => {
  it("resolves patient and procedure type names from the lookup maps", () => {
    const patientNames = new Map([["patient-1", "Juan Pérez"]]);
    const procedureTypeNames = new Map([["procedure-type-1", "Pterigión"]]);

    const view = toSurgeryListView(buildSurgery(), patientNames, procedureTypeNames);

    expect(view.patientName).toBe("Juan Pérez");
    expect(view.procedureTypeName).toBe("Pterigión");
  });

  it("falls back to a placeholder when an id has no matching entry", () => {
    const view = toSurgeryListView(buildSurgery(), new Map(), new Map());

    expect(view.patientName).toBe("Unknown patient");
    expect(view.procedureTypeName).toBe("Unknown procedure");
  });

  it("counts controls without needing them mapped individually", () => {
    const view = toSurgeryListView(
      buildSurgery({ controls: [buildControl(), buildControl({ id: "control-2" })] }),
      new Map(),
      new Map(),
    );
    expect(view.controlCount).toBe(2);
  });
});

describe("toSurgeryDetailView", () => {
  it("includes the full mapped Control history and the participating-resident roster", () => {
    const surgery = buildSurgery({
      participatingResidentIds: ["resident-1"],
      controls: [buildControl({ id: "control-1", recordedAt: "2026-01-16T10:00:00.000Z" })],
    });

    const view = toSurgeryDetailView(surgery, new Map(), new Map());

    expect(view.participatingResidentIds).toEqual(["resident-1"]);
    expect(view.controls).toHaveLength(1);
    expect(view.controls[0]?.id).toBe("control-1");
  });

  it("sorts controls newest first", () => {
    const surgery = buildSurgery({
      controls: [
        buildControl({ id: "older", recordedAt: "2026-01-10T10:00:00.000Z" }),
        buildControl({ id: "newer", recordedAt: "2026-01-20T10:00:00.000Z" }),
      ],
    });

    const view = toSurgeryDetailView(surgery, new Map(), new Map());

    expect(view.controls.map((c) => c.id)).toEqual(["newer", "older"]);
  });
});
