import type { ResidentDto } from "./dtos";

export interface ResidentView {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirthLabel: string;
  active: boolean;
}

/** Mirrors `features/patients/mappers.ts`'s `toPatientView` exactly. */
export function toResidentView(dto: ResidentDto): ResidentView {
  return {
    id: dto.id,
    fullName: `${dto.firstName} ${dto.lastName}`,
    phone: dto.phone,
    email: dto.email,
    dateOfBirthLabel: formatDate(dto.dateOfBirth),
    active: dto.active,
  };
}

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
