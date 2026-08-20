/**
 * "Doesn't exist" is an Application-level concept, not a domain one — the
 * domain has no notion of absence, only of aggregates it's been handed.
 * This is distinct from DomainError, which is reserved for business rule
 * violations the domain itself is capable of recognizing.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
