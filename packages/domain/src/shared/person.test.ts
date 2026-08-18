import { describe, expect, it } from "vitest";
import { Person } from "./person.js";

const validAttributes = {
  firstName: "Ana",
  lastName: "Gomez",
  phone: "+54 11 5555-5555",
  email: "ana@example.com",
  dateOfBirth: new Date("1990-01-01"),
};

describe("Person", () => {
  it("is created with the required personal information", () => {
    const person = Person.create(validAttributes);

    expect(person.firstName).toBe("Ana");
    expect(person.lastName).toBe("Gomez");
    expect(person.phone).toBe("+54 11 5555-5555");
    expect(person.email).toBe("ana@example.com");
    expect(person.dateOfBirth).toEqual(new Date("1990-01-01"));
    expect(person.metadata).toBeUndefined();
  });

  it.each([
    ["firstName", { ...validAttributes, firstName: "" }],
    ["lastName", { ...validAttributes, lastName: "" }],
    ["phone", { ...validAttributes, phone: "" }],
    ["email", { ...validAttributes, email: "" }],
  ])("cannot be created without %s", (_field, attributes) => {
    expect(() => Person.create(attributes)).toThrow();
  });

  it("accepts optional metadata", () => {
    const person = Person.create({ ...validAttributes, metadata: { insurance: "OSDE" } });

    expect(person.metadata).toEqual({ insurance: "OSDE" });
  });

  it("is equal to another Person with the same personal data", () => {
    const a = Person.create(validAttributes);
    const b = Person.create(validAttributes);

    expect(a.equals(b)).toBe(true);
  });

  it("is not equal to a Person with different personal data", () => {
    const a = Person.create(validAttributes);
    const b = Person.create({ ...validAttributes, email: "other@example.com" });

    expect(a.equals(b)).toBe(false);
  });
});
