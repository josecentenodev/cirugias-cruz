import { DomainError } from "@cirugias-cruz/domain";
import type { ResidentCredentialRepository } from "../resident/resident-credential-repository.js";
import type { PhysicianCredentialRepository } from "./physician-credential-repository.js";
import type { PasswordHasher } from "./password-hasher.js";
import type { Session, SessionRepository } from "./session-repository.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginDeps {
  physicianCredentialRepository: PhysicianCredentialRepository;
  residentCredentialRepository: ResidentCredentialRepository;
  passwordHasher: PasswordHasher;
  sessionRepository: SessionRepository;
}

/**
 * Authenticates either a Physician or a Resident by email + password —
 * one login for both principal types (ADR 0017), since both are
 * identified by `email` (ADR 0012) and email is enforced unique across
 * both credential stores (see `registerPhysician`/`registerResident`).
 * The Physician store is checked first; a hit there short-circuits
 * before the Resident store is ever touched.
 *
 * Deliberately returns the same "Invalid email or password" error for
 * "no such email" and "wrong password" in both branches — which
 * credential was wrong, and even which *kind* of principal an email
 * belongs to, is not information the caller needs before proving they
 * hold the password.
 */
export function login(deps: LoginDeps) {
  return async function execute(input: LoginInput): Promise<Session> {
    const physicianCredential = await deps.physicianCredentialRepository.findByEmail(input.email);
    if (physicianCredential) {
      const passwordMatches = await deps.passwordHasher.verify(
        input.password,
        physicianCredential.passwordHash,
      );
      if (!passwordMatches) {
        throw new DomainError("Invalid email or password");
      }

      // ADR 0016: email confirmation is paused for MVP. `confirmedAt`
      // is still recorded on the credential (dormant — see the ADR) but
      // no longer checked here; re-enabling it later is restoring the
      // check this comment used to describe, not rebuilding anything.
      return deps.sessionRepository.create({
        userType: "physician",
        physicianId: physicianCredential.physicianId,
      });
    }

    const residentCredential = await deps.residentCredentialRepository.findByEmail(input.email);
    if (!residentCredential) {
      throw new DomainError("Invalid email or password");
    }

    const passwordMatches = await deps.passwordHasher.verify(
      input.password,
      residentCredential.passwordHash,
    );
    if (!passwordMatches) {
      throw new DomainError("Invalid email or password");
    }

    // Checked only after the password is confirmed correct — same
    // reasoning ADR 0015 already established for the (now-paused)
    // unconfirmed-email case: the caller has proven they hold this
    // credential, so a specific message is no longer an information
    // leak (ADR 0017).
    if (!residentCredential.active) {
      throw new DomainError("This account has been deactivated");
    }

    return deps.sessionRepository.create({
      userType: "resident",
      physicianId: residentCredential.physicianId,
      residentId: residentCredential.residentId,
    });
  };
}
