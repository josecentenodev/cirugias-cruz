import type { PatientDto } from "./dtos";

/** What `PatientList`/`PatientDetail` actually render — a small, display-ready shape derived from the wire DTO. */
export interface PatientView {
  id: string;
  fullName: string;
  dni?: string;
  age: number;
  dateOfBirthLabel: string;
  observations?: string;
}

export function toPatientView(dto: PatientDto): PatientView {
  return {
    id: dto.id,
    fullName: `${dto.firstName} ${dto.lastName}`,
    dni: dto.dni,
    age: ageInYears(dto.dateOfBirth),
    dateOfBirthLabel: formatDate(dto.dateOfBirth),
    observations: dto.observations,
  };
}

/**
 * Full years elapsed from `dateOfBirth` to today — the patient's age as a
 * clinician would state it (F-02/B1). Computed in UTC for the same
 * timezone-stability reason as `formatDate`. Returns 0 for an unparseable
 * or future date rather than a negative or NaN value.
 */
function ageInYears(iso: string): number {
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) {
    return 0;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

/**
 * `dateOfBirth` is a calendar date, not a moment in time — formatted in
 * UTC deliberately, so a physician in any timezone sees the same date
 * `api` stored, rather than it shifting a day depending on the server's
 * local offset (a real display bug a naive `toLocaleDateString()` call
 * would have, not just a test-fragility concern).
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
