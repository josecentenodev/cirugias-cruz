import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "./bcrypt-password-hasher.js";

describe("BcryptPasswordHasher", () => {
  it("hashes a password to something other than the plaintext", async () => {
    const hasher = new BcryptPasswordHasher();

    const hash = await hasher.hash("s3cret-password");

    expect(hash).not.toBe("s3cret-password");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its hash", async () => {
    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash("s3cret-password");

    await expect(hasher.verify("s3cret-password", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash("s3cret-password");

    await expect(hasher.verify("wrong-password", hash)).resolves.toBe(false);
  });
});
