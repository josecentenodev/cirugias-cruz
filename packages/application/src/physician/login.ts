import { DomainError } from "@cirugias-cruz/domain";
import type { PhysicianCredentialRepository } from "./physician-credential-repository.js";
import type { PasswordHasher } from "./password-hasher.js";
import type { Session, SessionRepository } from "./session-repository.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginDeps {
  physicianCredentialRepository: PhysicianCredentialRepository;
  passwordHasher: PasswordHasher;
  sessionRepository: SessionRepository;
}

/**
 * Authenticates a Physician by email + password and creates a
 * server-side session. Deliberately returns the same error for "no such
 * email" and "wrong password" — which credential was wrong is not
 * information the caller needs, and distinguishing them would leak
 * whether an email is registered.
 */
export function login(deps: LoginDeps) {
  return async function execute(input: LoginInput): Promise<Session> {
    const credential = await deps.physicianCredentialRepository.findByEmail(input.email);
    if (!credential) {
      throw new DomainError("Invalid email or password");
    }

    const passwordMatches = await deps.passwordHasher.verify(
      input.password,
      credential.passwordHash,
    );
    if (!passwordMatches) {
      throw new DomainError("Invalid email or password");
    }

    // Checked only after the password is confirmed correct (ADR 0015) —
    // unlike the email/password check above, there's no information-leak
    // concern here: the caller has already proven they own this
    // credential, so telling them specifically that it's unconfirmed
    // (rather than folding it into "invalid email or password") is a
    // real, distinct thing they can act on.
    if (!credential.confirmedAt) {
      throw new DomainError("Please confirm your email before logging in");
    }

    return deps.sessionRepository.create(credential.physicianId);
  };
}
