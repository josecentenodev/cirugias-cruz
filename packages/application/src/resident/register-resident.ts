import { DomainError, Resident } from "@cirugias-cruz/domain";
import type { PhysicianCredentialRepository } from "../physician/physician-credential-repository.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
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
  residentCredentialRepository: ResidentCredentialRepository;
  physicianCredentialRepository: PhysicianCredentialRepository;
}

/**
 * Registers a Resident in the acting physician's tenant, and creates a
 * credential row for them with **no usable password yet** (ADR 0029 —
 * amends ADR 0017's system-generated-temporary-password mechanism): the
 * Resident becomes able to log in only once they accept the invitation
 * this operation's caller sends right after (`sendResidentInvitation`,
 * kept separate the same way `sendConfirmationEmail` is kept separate
 * from `registerPhysician`). Email uniqueness is enforced across *both*
 * credential stores (Physician's and Resident's), not just this one:
 * `login` looks up a single email across both, so a collision between a
 * Physician and a Resident would make that lookup ambiguous — the same
 * reasoning `registerPhysician` already applies for its own store.
 */
export function registerResident(deps: RegisterResidentDeps) {
  return async function execute(input: RegisterResidentInput): Promise<RegisterResidentOutput> {
    const existingPhysician = await deps.physicianCredentialRepository.findByEmail(input.email);
    if (existingPhysician) {
      throw new DomainError("This email is already registered");
    }
    const existingResident = await deps.residentCredentialRepository.findByEmail(input.email);
    if (existingResident) {
      throw new DomainError("This email is already registered");
    }

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

    await deps.residentCredentialRepository.save({
      residentId: resident.id,
      physicianId: resident.physicianId,
      email: input.email,
      passwordHash: null,
      invitedAt: new Date(),
      acceptedAt: null,
      active: true,
    });

    return { residentId: resident.id };
  };
}
