import { describe, expect, it } from "vitest";
import { CustomField } from "./custom-field.js";

describe("CustomField", () => {
  it("is created with a required name, unit and magnitude", () => {
    const field = CustomField.create({
      name: "Corneal epithelial defect size",
      unit: "mm",
      magnitude: "length",
    });

    expect(field.name).toBe("Corneal epithelial defect size");
    expect(field.unit).toBe("mm");
    expect(field.magnitude).toBe("length");
    expect(field.description).toBeUndefined();
  });

  it("accepts an optional description", () => {
    const field = CustomField.create({
      name: "Redness",
      description: "Degree of conjunctival redness observed",
      unit: "grade",
      magnitude: "ordinal",
    });

    expect(field.description).toBe("Degree of conjunctival redness observed");
  });

  it("cannot be created without a name", () => {
    expect(() =>
      CustomField.create({ name: "", unit: "mm", magnitude: "length" }),
    ).toThrow();
  });

  it("cannot be created without a unit", () => {
    expect(() =>
      CustomField.create({ name: "Redness", unit: "", magnitude: "ordinal" }),
    ).toThrow();
  });

  it("cannot be created without a magnitude", () => {
    expect(() =>
      CustomField.create({ name: "Redness", unit: "grade", magnitude: "" }),
    ).toThrow();
  });

  it("is equal to another CustomField with the same values", () => {
    const a = CustomField.create({ name: "Redness", unit: "grade", magnitude: "ordinal" });
    const b = CustomField.create({ name: "Redness", unit: "grade", magnitude: "ordinal" });

    expect(a.equals(b)).toBe(true);
  });

  it("is not equal to a CustomField with different values", () => {
    const a = CustomField.create({ name: "Redness", unit: "grade", magnitude: "ordinal" });
    const b = CustomField.create({ name: "Redness", unit: "mm", magnitude: "length" });

    expect(a.equals(b)).toBe(false);
  });
});
