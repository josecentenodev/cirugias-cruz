import type { PatientDto } from "./dtos";

/** What `PatientList`/`PatientDetail` actually render — a small, display-ready shape derived from the wire DTO. */
export interface PatientView {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirthLabel: string;
  observations?: string;
}

export function toPatientView(dto: PatientDto): PatientView {
  return {
    id: dto.id,
    fullName: `${dto.firstName} ${dto.lastName}`,
    phone: dto.phone,
    email: dto.email,
    dateOfBirthLabel: formatDate(dto.dateOfBirth),
    observations: dto.observations,
  };
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
