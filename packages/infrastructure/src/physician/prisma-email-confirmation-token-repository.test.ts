import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaEmailConfirmationTokenRepository } from "./prisma-email-confirmation-token-repository.js";

const PHYSICIAN_ID = "infra-test-physician-confirmation-token";

describe("PrismaEmailConfirmationTokenRepository", () => {
  const repository = new PrismaEmailConfirmationTokenRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null for an unknown token", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("creates a token and finds it back", async () => {
    const token = await repository.create(PHYSICIAN_ID);

    const found = await repository.findById(token.id);
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
  });

  it("treats an expired token as not found", async () => {
    const token = await repository.create(PHYSICIAN_ID);
    await testPrisma.emailConfirmationToken.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(repository.findById(token.id)).resolves.toBeNull();
  });

  it("deletes a token, invalidating it", async () => {
    const token = await repository.create(PHYSICIAN_ID);

    await repository.delete(token.id);

    await expect(repository.findById(token.id)).resolves.toBeNull();
  });

  it("is a no-op deleting an unknown token", async () => {
    await expect(repository.delete("does-not-exist")).resolves.toBeUndefined();
  });
});
