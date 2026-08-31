import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaPhysicianCredentialRepository } from "./prisma-physician-credential-repository.js";

const PHYSICIAN_ID = "infra-test-physician-credential";

describe("PrismaPhysicianCredentialRepository", () => {
  const repository = new PrismaPhysicianCredentialRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null when no credential exists for the email", async () => {
    await expect(repository.findByEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("saves a credential and finds it back by email", async () => {
    await repository.save({
      physicianId: PHYSICIAN_ID,
      email: "Ana.Credential@Example.com",
      passwordHash: "hashed-value",
    });

    const found = await repository.findByEmail("Ana.Credential@Example.com");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.passwordHash).toBe("hashed-value");
  });

  it("finds the credential case-insensitively", async () => {
    await repository.save({
      physicianId: PHYSICIAN_ID,
      email: "Ana.Credential@Example.com",
      passwordHash: "hashed-value",
    });

    const found = await repository.findByEmail("ana.credential@example.com");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
  });

  it("enforces case-insensitive email uniqueness at the database level", async () => {
    await repository.save({
      physicianId: PHYSICIAN_ID,
      email: "Ana.Credential@Example.com",
      passwordHash: "hashed-value",
    });

    await expect(
      testPrisma.physicianCredential.create({
        data: {
          physicianId: "infra-test-physician-credential-other",
          email: "ana.credential@example.com",
          emailNormalized: "ana.credential@example.com",
          passwordHash: "another-hash",
        },
      }),
    ).rejects.toThrow();
  });
});
