import { Resident } from "@cirugias-cruz/domain";
import type { ResidentRepository } from "./resident-repository.js";

export interface RegisterResidentInput {
  physicianId: string;
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  metadata?: Record<string, unknown>;
}

export interface RegisterResidentOutput {
  residentId: string;
}

export interface RegisterResidentDeps {
  residentRepository: ResidentRepository;
}

/**
 * Registers a Resident in the acting physician's tenant. Mirrors
 * registerPatient: Resident.create only validates its own fields and the
 * tenant it's given, so this is a thin pass-through to the domain, plus
 * persistence.
 */
export function registerResident(deps: RegisterResidentDeps) {
  return async function execute(input: RegisterResidentInput): Promise<RegisterResidentOutput> {
    const resident = Resident.create({
      id: input.id,
      physicianId: input.physicianId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      metadata: input.metadata,
    });

    await deps.residentRepository.save(resident);

    return { residentId: resident.id };
  };
}
