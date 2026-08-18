import { describe, expect, it } from "vitest";
import { Resident } from "./resident.js";

const validAttributes = {
  id: "resident-1",
  physicianId: "physician-1",
  firstName: "Laura",
  lastName: "Diaz",
  phone: "+54 11 3333-3333",
  email: "laura@example.com",
  dateOfBirth: new Date("1995-02-02"),
};

describe("Resident", () => {
  it("belongs to the physician tenant that created it", () => {
    const resident = Resident.create(validAttributes);

    expect(resident.physicianId).toBe("physician-1");
    expect(resident.belongsToTenant("physician-1")).toBe(true);
    expect(resident.belongsToTenant("physician-2")).toBe(false);
  });

  it("cannot be created without an owning physician (tenant)", () => {
    expect(() => Resident.create({ ...validAttributes, physicianId: "" })).toThrow();
  });

  it("cannot be created without an id", () => {
    expect(() => Resident.create({ ...validAttributes, id: "" })).toThrow();
  });

  it("cannot be created without the required personal information", () => {
    expect(() => Resident.create({ ...validAttributes, phone: "" })).toThrow();
  });
});
