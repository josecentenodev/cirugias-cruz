import type { SessionRepository } from "./session-repository.js";

export interface LogoutInput {
  sessionId: string;
}

export interface LogoutDeps {
  sessionRepository: SessionRepository;
}

/** Invalidates a session. Deleting an unknown/already-gone session is a no-op, not an error. */
export function logout(deps: LogoutDeps) {
  return async function execute(input: LogoutInput): Promise<void> {
    await deps.sessionRepository.delete(input.sessionId);
  };
}
