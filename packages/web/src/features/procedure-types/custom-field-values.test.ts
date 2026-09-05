import { describe, expect, it } from "vitest";
import type { CustomFieldDto } from "./dtos";
import { collectCustomFieldValues, hasCustomFieldInputs } from "./custom-field-values";

function def(
  overrides: Partial<CustomFieldDto> & Pick<CustomFieldDto, "id" | "constraint">,
): CustomFieldDto {
  return {
    name: overrides.id,
    scope: "SURGERY",
    ...overrides,
  };
}

const NUMBER = def({ id: "eva", constraint: { valueType: "NUMBER", unit: "0-10" } });
const ENUM = def({
  id: "tech",
  constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic"] },
});
const TEXT = def({ id: "note", constraint: { valueType: "TEXT" } });

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    data.set(k, v);
  }
  return data;
}

describe("hasCustomFieldInputs", () => {
  it("is true only when a customField:* key is present", () => {
    expect(hasCustomFieldInputs(form({ patientId: "p1" }))).toBe(false);
    expect(hasCustomFieldInputs(form({ "customField:eva": "" }))).toBe(true);
  });
});

describe("collectCustomFieldValues", () => {
  it("coerces a NUMBER field's string to a number", () => {
    expect(collectCustomFieldValues(form({ "customField:eva": "3" }), [NUMBER])).toEqual([
      { definitionId: "eva", value: 3 },
    ]);
  });

  it("keeps ENUM and TEXT values as trimmed strings", () => {
    expect(
      collectCustomFieldValues(
        form({ "customField:tech": " Autograft ", "customField:note": "  swelling  " }),
        [ENUM, TEXT],
      ),
    ).toEqual([
      { definitionId: "tech", value: "Autograft" },
      { definitionId: "note", value: "swelling" },
    ]);
  });

  it("omits blank inputs entirely (every CustomField is optional)", () => {
    expect(
      collectCustomFieldValues(form({ "customField:eva": "", "customField:note": "   " }), [
        NUMBER,
        TEXT,
      ]),
    ).toEqual([]);
  });

  it("drops a NUMBER input that is not numeric rather than forwarding it", () => {
    expect(collectCustomFieldValues(form({ "customField:eva": "abc" }), [NUMBER])).toEqual([]);
  });

  it("ignores keys with no matching definition — the client is never trusted about which fields exist", () => {
    expect(
      collectCustomFieldValues(
        form({ "customField:ghost": "x", "customField:tech": "Autograft" }),
        [ENUM],
      ),
    ).toEqual([{ definitionId: "tech", value: "Autograft" }]);
  });
});
