import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupPhysician,
  cleanupResident,
  seedPhysician,
  seedResident,
  seedResidentCredential,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaResidentInvitationTokenRepository } from "./prisma-resident-invitation-token-repository.js";

const PHYSICIAN_ID = "infra-test-physician-invitation-token";
const RESIDENT_ID = "infra-test-resident-invitation-token";

describe("PrismaResidentInvitationTokenRepository", () => {
  const repository = new PrismaResidentInvitationTokenRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
    await seedResident(RESIDENT_ID, PHYSICIAN_ID);
    await seedResidentCredential(RESIDENT_ID, PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupResident(RESIDENT_ID);
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null for an unknown token", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("creates a token and finds it back", async () => {
    const token = await repository.create(RESIDENT_ID);

    const found = await repository.findById(token.id);
    expect(found?.residentId).toBe(RESIDENT_ID);
  });

  it("treats an expired token as not found", async () => {
    const token = await repository.create(RESIDENT_ID);
    await testPrisma.residentInvitationToken.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(repository.findById(token.id)).resolves.toBeNull();
  });

  it("deletes a token, invalidating it", async () => {
    const token = await repository.create(RESIDENT_ID);

    await repository.delete(token.id);

    await expect(repository.findById(token.id)).resolves.toBeNull();
  });

  it("deletes every token for a resident", async () => {
    const first = await repository.create(RESIDENT_ID);
    const second = await repository.create(RESIDENT_ID);

    await repository.deleteByResidentId(RESIDENT_ID);

    await expect(repository.findById(first.id)).resolves.toBeNull();
    await expect(repository.findById(second.id)).resolves.toBeNull();
  });

  it("is a no-op deleting an unknown token", async () => {
    await expect(repository.delete("does-not-exist")).resolves.toBeUndefined();
  });
});
