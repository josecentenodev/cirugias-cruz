import { DomainError, Resident } from "@cirugias-cruz/domain";
import type { PhysicianCredentialRepository } from "../physician/physician-credential-repository.js";
import type { PasswordHasher } from "../physician/password-hasher.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentRepository } from "./resident-repository.js";
import type { TemporaryPasswordGenerator } from "./temporary-password-generator.js";

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
  /**
   * The freshly generated temporary password — returned once here for
   * convenience (so the Physician sees it immediately after creating the
   * Resident), and separately retrievable later via
   * `viewResidentTemporaryPassword` for as long as it hasn't been
   * changed (ADR 0017, decision item 4).
   */
  temporaryPassword: string;
}

export interface RegisterResidentDeps {
  residentRepository: ResidentRepository;
  residentCredentialRepository: ResidentCredentialRepository;
  physicianCredentialRepository: PhysicianCredentialRepository;
  passwordHasher: PasswordHasher;
  temporaryPasswordGenerator: TemporaryPasswordGenerator;
}

/**
 * Registers a Resident in the acting physician's tenant, and — new as of
 * ADR 0017 — creates login credentials for them at the same time: a
 * system-generated random temporary password, which the Resident must
 * change on first login. Email uniqueness is enforced across *both*
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

    const temporaryPassword = deps.temporaryPasswordGenerator.generate();
    const passwordHash = await deps.passwordHasher.hash(temporaryPassword);
    await deps.residentCredentialRepository.save({
      residentId: resident.id,
      physicianId: resident.physicianId,
      email: input.email,
      passwordHash,
      temporaryPassword,
      mustChangePassword: true,
      active: true,
    });

    return { residentId: resident.id, temporaryPassword };
  };
}
