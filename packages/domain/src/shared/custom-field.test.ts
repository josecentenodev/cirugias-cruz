import { describe, expect, it } from "vitest";
import { CustomField } from "./custom-field.js";

describe("CustomField", () => {
  it("is created with a required name, scope and constraint", () => {
    const field = CustomField.create({
      id: "cf-1",
      name: "Surgical technique",
      scope: "SURGERY",
      constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic membrane"] },
    });

    expect(field.name).toBe("Surgical technique");
    expect(field.scope).toBe("SURGERY");
    expect(field.valueType).toBe("ENUM");
    expect(field.description).toBeUndefined();
  });

  it("exposes a unit only for a NUMBER field, from its constraint", () => {
    const numberField = CustomField.create({
      id: "cf-2",
      name: "Pain (EVA)",
      scope: "CONTROL",
      constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
    });
    const enumField = CustomField.create({
      id: "cf-3",
      name: "Technique",
      scope: "SURGERY",
      constraint: { valueType: "ENUM", options: ["Autograft"] },
    });

    expect(numberField.unit).toBe("0-10");
    expect(enumField.unit).toBeUndefined();
  });

  it("accepts a NUMBER field with no unit", () => {
    const field = CustomField.create({
      id: "cf-4",
      name: "Lesion size",
      scope: "SURGERY",
      constraint: { valueType: "NUMBER" },
    });

    expect(field.unit).toBeUndefined();
  });

  it("accepts an optional description", () => {
    const field = CustomField.create({
      id: "cf-5",
      name: "Pain (EVA)",
      description: "Visual analog pain scale",
      scope: "CONTROL",
      constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
    });

    expect(field.description).toBe("Visual analog pain scale");
  });

  it("cannot be created without an id", () => {
    expect(() =>
      CustomField.create({
        id: "",
        name: "Redness",
        scope: "CONTROL",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created without a name", () => {
    expect(() =>
      CustomField.create({
        id: "cf-6",
        name: "",
        scope: "SURGERY",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created as ENUM with zero options", () => {
    expect(() =>
      CustomField.create({
        id: "cf-7",
        name: "Technique",
        scope: "SURGERY",
        constraint: { valueType: "ENUM", options: [] },
      }),
    ).toThrow();
  });

  it("is equal to another CustomField with the same id", () => {
    const a = CustomField.create({
      id: "cf-8",
      name: "Redness",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });
    const b = CustomField.create({
      id: "cf-8",
      name: "Different name",
      scope: "SURGERY",
      constraint: { valueType: "NUMBER" },
    });

    expect(a.equals(b)).toBe(true);
  });

  it("is not equal to a CustomField with a different id", () => {
    const a = CustomField.create({
      id: "cf-9",
      name: "Redness",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });
    const b = CustomField.create({
      id: "cf-10",
      name: "Redness",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });

    expect(a.equals(b)).toBe(false);
  });
});
