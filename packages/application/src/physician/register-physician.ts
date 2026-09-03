import { DomainError, Physician } from "@cirugias-cruz/domain";
import type { PhysicianRepository } from "./physician-repository.js";
import type { PhysicianCredentialRepository } from "./physician-credential-repository.js";
import type { PasswordHasher } from "./password-hasher.js";

export interface RegisterPhysicianInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  password: string;
  metadata?: Record<string, unknown>;
}

export interface RegisterPhysicianOutput {
  physicianId: string;
}

export interface RegisterPhysicianDeps {
  physicianRepository: PhysicianRepository;
  physicianCredentialRepository: PhysicianCredentialRepository;
  passwordHasher: PasswordHasher;
}

/**
 * Registers a real Physician — required for Milestone 3, since Physician
 * identity previously only ever existed via test-fixture seeding (see
 * ADR 0012). Orchestrates across two repositories because the credential
 * (email + password hash) is deliberately not part of the `Physician`
 * aggregate — see `physician-credential-repository.ts`. Email uniqueness
 * is a business rule Domain cannot enforce itself (it has no repository
 * access), so — following the same pattern already used for
 * `registerSurgery`'s tenant checks — Application enforces it here using
 * the domain's own `DomainError`.
 */
export function registerPhysician(deps: RegisterPhysicianDeps) {
  return async function execute(input: RegisterPhysicianInput): Promise<RegisterPhysicianOutput> {
    const existing = await deps.physicianCredentialRepository.findByEmail(input.email);
    if (existing) {
      throw new DomainError("A physician with this email is already registered");
    }

    const physician = Physician.create({
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      metadata: input.metadata,
    });

    const passwordHash = await deps.passwordHasher.hash(input.password);

    await deps.physicianRepository.save(physician);
    await deps.physicianCredentialRepository.save({
      physicianId: physician.id,
      email: input.email,
      passwordHash,
      // Unconfirmed until the physician clicks their emailed confirmation
      // link — see ADR 0015. `registerPhysician` itself never sends that
      // email; the HTTP route orchestrates `sendConfirmationEmail`
      // separately, keeping this operation's own dependency list
      // unchanged.
      confirmedAt: null,
    });

    return { physicianId: physician.id };
  };
}
