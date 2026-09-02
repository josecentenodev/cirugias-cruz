import { describe, expect, it } from "vitest";
import { toPatientView } from "./mappers.js";
import type { PatientDto } from "./dtos.js";

function buildDto(overrides: Partial<PatientDto> = {}): PatientDto {
  return {
    id: "patient-1",
    physicianId: "physician-1",
    firstName: "Ana",
    lastName: "García",
    phone: "555-0101",
    email: "ana@example.com",
    dateOfBirth: "1990-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toPatientView", () => {
  it("combines first and last name", () => {
    expect(toPatientView(buildDto()).fullName).toBe("Ana García");
  });

  it("formats the date of birth for display", () => {
    const view = toPatientView(buildDto({ dateOfBirth: "1990-01-15T00:00:00.000Z" }));
    expect(view.dateOfBirthLabel).toBe("Jan 15, 1990");
  });

  it("passes through observations only when present", () => {
    expect(toPatientView(buildDto()).observations).toBeUndefined();
    expect(toPatientView(buildDto({ observations: "Notes" })).observations).toBe("Notes");
  });

  it("falls back to the raw string if the date can't be parsed", () => {
    const view = toPatientView(buildDto({ dateOfBirth: "not-a-date" }));
    expect(view.dateOfBirthLabel).toBe("not-a-date");
  });
});
