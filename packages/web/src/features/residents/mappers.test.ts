import { describe, expect, it } from "vitest";
import { toResidentView } from "./mappers.js";
import type { ResidentDto } from "./dtos.js";

function buildDto(overrides: Partial<ResidentDto> = {}): ResidentDto {
  return {
    id: "resident-1",
    physicianId: "physician-1",
    firstName: "Laura",
    lastName: "Díaz",
    phone: "+54 11 3333-3333",
    email: "laura@example.com",
    dateOfBirth: "1995-02-02T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

describe("toResidentView", () => {
  it("combines first and last name", () => {
    expect(toResidentView(buildDto()).fullName).toBe("Laura Díaz");
  });

  it("formats the date of birth for display, in UTC", () => {
    const view = toResidentView(buildDto({ dateOfBirth: "1995-02-02T00:00:00.000Z" }));
    expect(view.dateOfBirthLabel).toBe("Feb 2, 1995");
  });

  it("falls back to the raw string if the date can't be parsed", () => {
    const view = toResidentView(buildDto({ dateOfBirth: "not-a-date" }));
    expect(view.dateOfBirthLabel).toBe("not-a-date");
  });
});
