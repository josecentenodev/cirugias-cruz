import { randomInt } from "node:crypto";
import type { TemporaryPasswordGenerator } from "@cirugias-cruz/application";

// Excludes visually ambiguous characters (0/O, 1/I/l) — this is read off
// a screen by the Physician and typed in by the Resident, unlike every
// other opaque token this product issues (session/confirmation ids),
// which are never hand-typed.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 10;

export class RandomTemporaryPasswordGenerator implements TemporaryPasswordGenerator {
  generate(): string {
    let password = "";
    for (let i = 0; i < LENGTH; i++) {
      password += ALPHABET[randomInt(ALPHABET.length)];
    }
    return password;
  }
}
