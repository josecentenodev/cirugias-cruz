import { describe, expect, it } from "vitest";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { toControlView, toSurgeryDetailView, toSurgeryListView } from "./mappers.js";
import type { ControlDto, SurgeryDto } from "./dtos.js";

const evaDef: CustomFieldDto = {
  id: "eva",
  name: "Dolor (EVA)",
  scope: "CONTROL",
  constraint: { valueType: "NUMBER", unit: "0-10" },
};
const techDef: CustomFieldDto = {
  id: "tech",
  name: "Técnica",
  scope: "SURGERY",
  constraint: { valueType: "ENUM", options: ["Autograft"] },
};
const defs = new Map([evaDef, techDef].map((d) => [d.id, d]));

function buildSurgery(overrides: Partial<SurgeryDto> = {}): SurgeryDto {
  return {
    id: "surgery-1",
    physicianId: "physician-1",
    patientId: "patient-1",
    procedureTypeId: "procedure-type-1",
    performedAt: "2026-01-15T00:00:00.000Z",
    state: "DONE",
    participatingResidentIds: [],
    customFieldValues: [],
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
    customFieldValues: [],
    ...overrides,
  };
}

describe("toControlView", () => {
  it("labels a physician-authored control", () => {
    const view = toControlView(buildControl(), new Map());
    expect(view.authorLabel).toBe("You (physician)");
  });

  it("labels a resident-authored control with the resolved resident name", () => {
    const residentNames = new Map([["resident-1", "Laura Díaz"]]);
    const view = toControlView(
      buildControl({ author: { type: "resident", residentId: "resident-1" } }),
      residentNames,
    );
    expect(view.authorLabel).toBe("Laura Díaz");
  });

  it("falls back to a placeholder when the authoring resident has no matching entry", () => {
    const view = toControlView(
      buildControl({ author: { type: "resident", residentId: "resident-1" } }),
      new Map(),
    );
    expect(view.authorLabel).toBe("Unknown resident");
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

    const view = toControlView(buildControl({ recordedAt }), new Map());

    expect(view.recordedAtInputValue).toBe(expectedLocalValue);
    expect(view.recordedAtLabel).toContain("2026");
  });

  it("round-trips a datetime-local value unchanged: re-parsing it produces the same recordedAtInputValue", () => {
    // The concrete correctness property that matters: pre-filling the
    // edit form with recordedAtInputValue and resubmitting it unchanged
    // must not silently shift the Control's recorded time.
    const original = toControlView(
      buildControl({ recordedAt: "2026-01-16T14:30:00.000Z" }),
      new Map(),
    );
    const roundTripped = toControlView(
      buildControl({ recordedAt: new Date(original.recordedAtInputValue).toISOString() }),
      new Map(),
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
  it("includes the full mapped Control history and the participating-resident roster, names resolved", () => {
    const surgery = buildSurgery({
      participatingResidentIds: ["resident-1"],
      controls: [buildControl({ id: "control-1", recordedAt: "2026-01-16T10:00:00.000Z" })],
    });
    const residentNames = new Map([["resident-1", "Laura Díaz"]]);

    const view = toSurgeryDetailView(surgery, new Map(), new Map(), residentNames);

    expect(view.participants).toEqual([{ id: "resident-1", name: "Laura Díaz" }]);
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

    const view = toSurgeryDetailView(surgery, new Map(), new Map(), new Map());

    expect(view.controls.map((c) => c.id)).toEqual(["newer", "older"]);
  });

  it("resolves recorded CustomField values to their definition's name, with a NUMBER field's unit", () => {
    const surgery = buildSurgery({
      customFieldValues: [{ definitionId: "tech", value: "Autograft" }],
      controls: [
        buildControl({ id: "control-1", customFieldValues: [{ definitionId: "eva", value: 3 }] }),
      ],
    });

    const view = toSurgeryDetailView(surgery, new Map(), new Map(), new Map(), defs);

    expect(view.customFieldValues).toEqual([
      { definitionId: "tech", label: "Técnica", displayValue: "Autograft" },
    ]);
    expect(view.controls[0]?.customFieldValues).toEqual([
      { definitionId: "eva", label: "Dolor (EVA)", displayValue: "3 0-10" },
    ]);
  });

  it("falls back to the raw definition id when no definition is known", () => {
    const surgery = buildSurgery({
      customFieldValues: [{ definitionId: "gone", value: "x" }],
    });

    const view = toSurgeryDetailView(surgery, new Map(), new Map(), new Map());

    expect(view.customFieldValues).toEqual([
      { definitionId: "gone", label: "gone", displayValue: "x" },
    ]);
  });
});
