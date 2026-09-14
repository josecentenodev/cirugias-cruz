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

      // ADR 0028: the confirmation gate is enforced again (0016's pause
      // lifted now that a verified sending domain exists). Checked only
      // after the password is confirmed correct — same non-leaking
      // posture ADR 0015 originally established and ADR 0017 item 9
      // reuses for a deactivated Resident: the caller has already proven
      // they hold this credential, so a specific message costs nothing.
      if (!physicianCredential.confirmedAt) {
        throw new DomainError(
          "Please confirm your email before logging in. Check your inbox for the confirmation link.",
        );
      }

      return deps.sessionRepository.create({
        userType: "physician",
        physicianId: physicianCredential.physicianId,
      });
    }

    const residentCredential = await deps.residentCredentialRepository.findByEmail(input.email);
    if (!residentCredential) {
      throw new DomainError("Invalid email or password");
    }

    if (!residentCredential.passwordHash) {
      // ADR 0029, decision item 7: distinct from the generic case — an
      // invited-but-not-yet-accepted Resident has no password to prove
      // wrong in the first place, so there's nothing left to stay vague
      // about (same non-leaking-is-moot reasoning as the deactivated-
      // account case just below, and ADR 0028's confirmation gate).
      throw new DomainError(
        "This invitation hasn't been accepted yet. Check your email for the invitation link.",
      );
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
