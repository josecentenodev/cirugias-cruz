/**
 * A narrow port for generating a random temporary password (ADR 0017) —
 * same posture as `PasswordHasher`: a technical capability, not a
 * business invariant, so it stays out of Domain. Separate from
 * `PasswordHasher` because generating and hashing are different
 * concerns (one produces cleartext meant to be read once by a human via
 * `web`; the other never sees cleartext survive past its own call).
 */
export interface TemporaryPasswordGenerator {
  generate(): string;
}
