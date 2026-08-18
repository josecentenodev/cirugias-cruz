import { describe, expect, it } from "vitest";
import { Physician } from "./physician.js";

const validAttributes = {
  id: "physician-1",
  firstName: "Carlos",
  lastName: "Ruiz",
  phone: "+54 11 4444-4444",
  email: "carlos@example.com",
  dateOfBirth: new Date("1975-05-05"),
};

describe("Physician", () => {
  it("is created with an id and the required personal information", () => {
    const physician = Physician.create(validAttributes);

    expect(physician.id).toBe("physician-1");
    expect(physician.firstName).toBe("Carlos");
    expect(physician.email).toBe("carlos@example.com");
  });

  it("cannot be created without an id", () => {
    expect(() => Physician.create({ ...validAttributes, id: "" })).toThrow();
  });

  it("cannot be created without the required personal information", () => {
    expect(() => Physician.create({ ...validAttributes, email: "" })).toThrow();
  });
});
