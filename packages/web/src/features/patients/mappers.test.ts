import { describe, expect, it } from "vitest";
import { toPatientView } from "./mappers.js";
import type { PatientDto } from "./dtos.js";

function buildDto(overrides: Partial<PatientDto> = {}): PatientDto {
  return {
    id: "patient-1",
    physicianId: "physician-1",
    firstName: "Ana",
    lastName: "García",
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

  it("passes through the dni when present", () => {
    expect(toPatientView(buildDto()).dni).toBeUndefined();
    expect(toPatientView(buildDto({ dni: "30111222" })).dni).toBe("30111222");
  });

  it("computes age as full years elapsed from the date of birth", () => {
    const now = new Date();
    const thirtyYearsAgo = new Date(
      Date.UTC(now.getUTCFullYear() - 30, now.getUTCMonth(), now.getUTCDate()),
    );
    expect(toPatientView(buildDto({ dateOfBirth: thirtyYearsAgo.toISOString() })).age).toBe(30);
  });

  it("does not count a birthday that has not occurred yet this year", () => {
    const now = new Date();
    const dayAfterTodayTenYearsAgo = new Date(
      Date.UTC(now.getUTCFullYear() - 10, now.getUTCMonth(), now.getUTCDate() + 1),
    );
    expect(
      toPatientView(buildDto({ dateOfBirth: dayAfterTodayTenYearsAgo.toISOString() })).age,
    ).toBe(9);
  });

  it("returns 0 rather than a negative or NaN age for an unparseable date", () => {
    expect(toPatientView(buildDto({ dateOfBirth: "not-a-date" })).age).toBe(0);
  });

  it("falls back to the raw string if the date can't be parsed", () => {
    const view = toPatientView(buildDto({ dateOfBirth: "not-a-date" }));
    expect(view.dateOfBirthLabel).toBe("not-a-date");
  });
});
