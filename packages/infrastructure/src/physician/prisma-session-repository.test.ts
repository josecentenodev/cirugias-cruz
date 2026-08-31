import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupPhysician, seedPhysician, testPrisma } from "../testing/test-db.js";
import { PrismaSessionRepository } from "./prisma-session-repository.js";

const PHYSICIAN_ID = "infra-test-physician-session";

describe("PrismaSessionRepository", () => {
  const repository = new PrismaSessionRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null for an unknown session id", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("creates a session and finds it back", async () => {
    const session = await repository.create(PHYSICIAN_ID);

    const found = await repository.findById(session.id);
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
  });

  it("treats an expired session as not found", async () => {
    const session = await repository.create(PHYSICIAN_ID);
    await testPrisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(repository.findById(session.id)).resolves.toBeNull();
  });

  it("deletes a session, invalidating it", async () => {
    const session = await repository.create(PHYSICIAN_ID);

    await repository.delete(session.id);

    await expect(repository.findById(session.id)).resolves.toBeNull();
  });

  it("is a no-op deleting an unknown session", async () => {
    await expect(repository.delete("does-not-exist")).resolves.toBeUndefined();
  });
});
