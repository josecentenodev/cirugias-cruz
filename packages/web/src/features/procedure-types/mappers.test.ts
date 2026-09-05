import { describe, expect, it } from "vitest";
import { toCustomFieldView, toProcedureTypeDetailView, toProcedureTypeView } from "./mappers";
import type { CustomFieldDto, ProcedureTypeDto } from "./dtos";

function buildDto(overrides: Partial<ProcedureTypeDto> = {}): ProcedureTypeDto {
  return {
    id: "procedure-type-1",
    physicianId: "physician-1",
    name: "Pterigión",
    customFields: [],
    ...overrides,
  };
}

function buildCustomFieldDto(overrides: Partial<CustomFieldDto> = {}): CustomFieldDto {
  return {
    id: "cf-1",
    name: "Pain (EVA)",
    scope: "CONTROL",
    constraint: { valueType: "NUMBER", unit: "0-10" },
    ...overrides,
  };
}

describe("toProcedureTypeView", () => {
  it("passes the name through unchanged", () => {
    expect(toProcedureTypeView(buildDto()).name).toBe("Pterigión");
  });

  it("shows a placeholder when description is absent", () => {
    expect(toProcedureTypeView(buildDto()).description).toBe("—");
  });

  it("shows a placeholder when technique is absent", () => {
    expect(toProcedureTypeView(buildDto()).technique).toBe("—");
  });

  it("passes description and technique through when present", () => {
    const view = toProcedureTypeView(
      buildDto({ description: "Removal of pterygium", technique: "Conjunctival autograft" }),
    );
    expect(view.description).toBe("Removal of pterygium");
    expect(view.technique).toBe("Conjunctival autograft");
  });
});

describe("toCustomFieldView", () => {
  it("shows the type as its own label, separate from the rules", () => {
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "NUMBER" } })).typeLabel,
    ).toBe("Number");
    expect(
      toCustomFieldView(
        buildCustomFieldDto({ constraint: { valueType: "ENUM", options: ["Autograft"] } }),
      ).typeLabel,
    ).toBe("Options");
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "TEXT" } })).typeLabel,
    ).toBe("Text");
  });

  it("summarizes a NUMBER constraint's bounds", () => {
    expect(
      toCustomFieldView(
        buildCustomFieldDto({ constraint: { valueType: "NUMBER", min: 0, max: 10 } }),
      ).rulesSummary,
    ).toBe("0–10");
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "NUMBER", min: 0 } }))
        .rulesSummary,
    ).toBe("min 0");
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "NUMBER" } })).rulesSummary,
    ).toBe("—");
  });

  it("summarizes an ENUM constraint as its option list", () => {
    expect(
      toCustomFieldView(
        buildCustomFieldDto({
          constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic membrane"] },
        }),
      ).rulesSummary,
    ).toBe("one of: Autograft, Amniotic membrane");
  });

  it("summarizes a TEXT constraint with a max length", () => {
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "TEXT", maxLength: 100 } }))
        .rulesSummary,
    ).toBe("up to 100 characters");
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "TEXT" } })).rulesSummary,
    ).toBe("—");
  });

  it("shows a placeholder when description is absent", () => {
    expect(toCustomFieldView(buildCustomFieldDto()).description).toBe("—");
  });

  it("takes the unit from a NUMBER constraint, and shows a placeholder for other types", () => {
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "NUMBER", unit: "mmHg" } }))
        .unit,
    ).toBe("mmHg");
    expect(
      toCustomFieldView(buildCustomFieldDto({ constraint: { valueType: "NUMBER" } })).unit,
    ).toBe("—");
    expect(
      toCustomFieldView(
        buildCustomFieldDto({ constraint: { valueType: "ENUM", options: ["Autograft"] } }),
      ).unit,
    ).toBe("—");
  });
});

describe("toProcedureTypeDetailView", () => {
  it("keeps description/technique as undefined rather than a display placeholder", () => {
    const view = toProcedureTypeDetailView(buildDto());
    expect(view.description).toBeUndefined();
    expect(view.technique).toBeUndefined();
  });

  it("maps every CustomField", () => {
    const view = toProcedureTypeDetailView(
      buildDto({ customFields: [buildCustomFieldDto(), buildCustomFieldDto({ id: "cf-2" })] }),
    );
    expect(view.customFields).toHaveLength(2);
    expect(view.customFields.map((f) => f.id)).toEqual(["cf-1", "cf-2"]);
  });
});
