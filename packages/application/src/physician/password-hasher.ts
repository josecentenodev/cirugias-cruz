/**
 * A narrow port for password hashing/verification — not a repository,
 * just a technical capability Infrastructure provides (bcrypt or
 * equivalent). Kept out of Domain: hashing has no business invariant,
 * it's a security implementation detail.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, hash: string): Promise<boolean>;
}
