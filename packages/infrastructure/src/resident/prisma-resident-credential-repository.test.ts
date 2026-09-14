import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupPhysician,
  cleanupResident,
  seedPhysician,
  seedResident,
  testPrisma,
} from "../testing/test-db.js";
import { PrismaResidentCredentialRepository } from "./prisma-resident-credential-repository.js";

const PHYSICIAN_ID = "infra-test-physician-resident-credential";
const RESIDENT_ID = "infra-test-resident-credential";

describe("PrismaResidentCredentialRepository", () => {
  const repository = new PrismaResidentCredentialRepository(testPrisma);

  beforeEach(async () => {
    await seedPhysician(PHYSICIAN_ID);
    await seedResident(RESIDENT_ID, PHYSICIAN_ID);
  });

  afterEach(async () => {
    await cleanupResident(RESIDENT_ID);
    await cleanupPhysician(PHYSICIAN_ID);
  });

  function validCredential() {
    return {
      residentId: RESIDENT_ID,
      physicianId: PHYSICIAN_ID,
      email: "Resident.Credential@Example.com",
      passwordHash: null,
      invitedAt: new Date(),
      acceptedAt: null,
      active: true,
    };
  }

  it("returns null when no credential exists for the email", async () => {
    await expect(repository.findByEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("returns null when no credential exists for the resident id", async () => {
    await expect(repository.findByResidentId("does-not-exist")).resolves.toBeNull();
  });

  it("saves a credential and finds it back by email and by resident id", async () => {
    await repository.save(validCredential());

    const byEmail = await repository.findByEmail("resident.credential@example.com");
    expect(byEmail?.residentId).toBe(RESIDENT_ID);
    expect(byEmail?.passwordHash).toBeNull();
    expect(byEmail?.acceptedAt).toBeNull();
    expect(byEmail?.active).toBe(true);

    const byId = await repository.findByResidentId(RESIDENT_ID);
    expect(byId?.email).toBe("Resident.Credential@Example.com");
  });

  it("recordPasswordChange hashes the new password without touching acceptedAt", async () => {
    await repository.save({
      ...validCredential(),
      passwordHash: "old-hash",
      acceptedAt: new Date(),
    });

    await repository.recordPasswordChange(RESIDENT_ID, "new-hash");

    const found = await repository.findByResidentId(RESIDENT_ID);
    expect(found?.passwordHash).toBe("new-hash");
    expect(found?.acceptedAt).toBeInstanceOf(Date);
  });

  it("recordInvitationAccepted sets the password and stamps acceptedAt", async () => {
    await repository.save(validCredential());

    const acceptedAt = new Date();
    await repository.recordInvitationAccepted(RESIDENT_ID, "new-hash", acceptedAt);

    const found = await repository.findByResidentId(RESIDENT_ID);
    expect(found?.passwordHash).toBe("new-hash");
    expect(found?.acceptedAt?.getTime()).toBe(acceptedAt.getTime());
  });

  it("recordInvitationResent clears the password/acceptedAt and stamps a fresh invitedAt", async () => {
    await repository.save({
      ...validCredential(),
      passwordHash: "old-hash",
      acceptedAt: new Date("2020-01-01"),
    });

    const invitedAt = new Date();
    await repository.recordInvitationResent(RESIDENT_ID, invitedAt);

    const found = await repository.findByResidentId(RESIDENT_ID);
    expect(found?.passwordHash).toBeNull();
    expect(found?.acceptedAt).toBeNull();
    expect(found?.invitedAt.getTime()).toBe(invitedAt.getTime());
  });

  it("setActive deactivates and reactivates a credential", async () => {
    await repository.save(validCredential());

    await repository.setActive(RESIDENT_ID, false);
    expect((await repository.findByResidentId(RESIDENT_ID))?.active).toBe(false);

    await repository.setActive(RESIDENT_ID, true);
    expect((await repository.findByResidentId(RESIDENT_ID))?.active).toBe(true);
  });

  it("enforces case-insensitive email uniqueness at the database level", async () => {
    await repository.save(validCredential());

    await expect(
      testPrisma.residentCredential.create({
        data: {
          residentId: "infra-test-resident-credential-other",
          physicianId: PHYSICIAN_ID,
          email: "resident.credential@example.com",
          emailNormalized: "resident.credential@example.com",
          passwordHash: "another-hash",
        },
      }),
    ).rejects.toThrow();
  });
});
