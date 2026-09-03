import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupPhysician,
  cleanupResident,
  seedPhysician,
  seedResident,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaSessionRepository } from "./prisma-session-repository.js";

const PHYSICIAN_ID = "infra-test-physician-session";
const RESIDENT_ID = "infra-test-resident-session";

describe("PrismaSessionRepository", () => {
  const repository = new PrismaSessionRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
    await seedResident(RESIDENT_ID, PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupResident(RESIDENT_ID);
    await cleanupPhysician(PHYSICIAN_ID);
  });

  it("returns null for an unknown session id", async () => {
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("creates a physician session and finds it back", async () => {
    const session = await repository.create({ userType: "physician", physicianId: PHYSICIAN_ID });

    const found = await repository.findById(session.id);
    expect(found?.userType).toBe("physician");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.residentId).toBeNull();
  });

  it("creates a resident session and finds it back, carrying both the resident and the tenant (ADR 0017)", async () => {
    const session = await repository.create({
      userType: "resident",
      physicianId: PHYSICIAN_ID,
      residentId: RESIDENT_ID,
    });

    const found = await repository.findById(session.id);
    expect(found?.userType).toBe("resident");
    expect(found?.physicianId).toBe(PHYSICIAN_ID);
    expect(found?.residentId).toBe(RESIDENT_ID);
  });

  it("treats an expired session as not found", async () => {
    const session = await repository.create({ userType: "physician", physicianId: PHYSICIAN_ID });
    await testPrisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(repository.findById(session.id)).resolves.toBeNull();
  });

  it("deletes a session, invalidating it", async () => {
    const session = await repository.create({ userType: "physician", physicianId: PHYSICIAN_ID });

    await repository.delete(session.id);

    await expect(repository.findById(session.id)).resolves.toBeNull();
  });

  it("is a no-op deleting an unknown session", async () => {
    await expect(repository.delete("does-not-exist")).resolves.toBeUndefined();
  });

  it("deleteByResidentId invalidates every session held by that resident, and none of another's", async () => {
    const mine = await repository.create({
      userType: "resident",
      physicianId: PHYSICIAN_ID,
      residentId: RESIDENT_ID,
    });
    const physicianSession = await repository.create({
      userType: "physician",
      physicianId: PHYSICIAN_ID,
    });

    await repository.deleteByResidentId(RESIDENT_ID);

    await expect(repository.findById(mine.id)).resolves.toBeNull();
    await expect(repository.findById(physicianSession.id)).resolves.not.toBeNull();
  });
});
