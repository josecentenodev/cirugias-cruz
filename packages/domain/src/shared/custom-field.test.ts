import { describe, expect, it } from "vitest";
import { CustomField } from "./custom-field.js";

describe("CustomField", () => {
  it("is created with a required name, unit, magnitude, scope and constraint", () => {
    const field = CustomField.create({
      id: "cf-1",
      name: "Surgical technique",
      unit: "n/a",
      magnitude: "technique",
      scope: "SURGERY",
      constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic membrane"] },
    });

    expect(field.name).toBe("Surgical technique");
    expect(field.unit).toBe("n/a");
    expect(field.magnitude).toBe("technique");
    expect(field.scope).toBe("SURGERY");
    expect(field.valueType).toBe("ENUM");
    expect(field.description).toBeUndefined();
  });

  it("accepts an optional description", () => {
    const field = CustomField.create({
      id: "cf-2",
      name: "Pain (EVA)",
      description: "Visual analog pain scale",
      unit: "0-10",
      magnitude: "pain",
      scope: "CONTROL",
      constraint: { valueType: "NUMBER", min: 0, max: 10 },
    });

    expect(field.description).toBe("Visual analog pain scale");
  });

  it("cannot be created without an id", () => {
    expect(() =>
      CustomField.create({
        id: "",
        name: "Redness",
        unit: "grade",
        magnitude: "ordinal",
        scope: "CONTROL",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created without a name", () => {
    expect(() =>
      CustomField.create({
        id: "cf-3",
        name: "",
        unit: "mm",
        magnitude: "length",
        scope: "SURGERY",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created without a unit", () => {
    expect(() =>
      CustomField.create({
        id: "cf-4",
        name: "Redness",
        unit: "",
        magnitude: "ordinal",
        scope: "CONTROL",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created without a magnitude", () => {
    expect(() =>
      CustomField.create({
        id: "cf-5",
        name: "Redness",
        unit: "grade",
        magnitude: "",
        scope: "CONTROL",
        constraint: { valueType: "TEXT" },
      }),
    ).toThrow();
  });

  it("cannot be created as ENUM with zero options", () => {
    expect(() =>
      CustomField.create({
        id: "cf-6",
        name: "Technique",
        unit: "n/a",
        magnitude: "technique",
        scope: "SURGERY",
        constraint: { valueType: "ENUM", options: [] },
      }),
    ).toThrow();
  });

  it("is equal to another CustomField with the same id", () => {
    const a = CustomField.create({
      id: "cf-7",
      name: "Redness",
      unit: "grade",
      magnitude: "ordinal",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });
    const b = CustomField.create({
      id: "cf-7",
      name: "Different name",
      unit: "mm",
      magnitude: "length",
      scope: "SURGERY",
      constraint: { valueType: "NUMBER" },
    });

    expect(a.equals(b)).toBe(true);
  });

  it("is not equal to a CustomField with a different id", () => {
    const a = CustomField.create({
      id: "cf-8",
      name: "Redness",
      unit: "grade",
      magnitude: "ordinal",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });
    const b = CustomField.create({
      id: "cf-9",
      name: "Redness",
      unit: "grade",
      magnitude: "ordinal",
      scope: "CONTROL",
      constraint: { valueType: "TEXT" },
    });

    expect(a.equals(b)).toBe(false);
  });
});
