import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  InMemoryPhysicianCredentialRepository,
  InMemoryResidentCredentialRepository,
  InMemorySessionRepository,
} from "../testing/fakes.js";
import { login } from "./login.js";

function buildDeps() {
  return {
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
    residentCredentialRepository: new InMemoryResidentCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionRepository: new InMemorySessionRepository(),
  };
}

async function seedCredential(
  deps: ReturnType<typeof buildDeps>,
  overrides: { email?: string; password?: string; confirmedAt?: Date | null } = {},
) {
  const password = overrides.password ?? "s3cret-password";
  const email = overrides.email ?? "ana@example.com";
  await deps.physicianCredentialRepository.save({
    physicianId: "physician-1",
    email,
    passwordHash: await deps.passwordHasher.hash(password),
    confirmedAt: overrides.confirmedAt === undefined ? new Date() : overrides.confirmedAt,
  });
  return { email, password };
}

async function seedResidentCredential(
  deps: ReturnType<typeof buildDeps>,
  overrides: { email?: string; password?: string; active?: boolean } = {},
) {
  const password = overrides.password ?? "r3sident-password";
  const email = overrides.email ?? "resident@example.com";
  deps.residentCredentialRepository.seed({
    residentId: "resident-1",
    physicianId: "physician-1",
    email,
    passwordHash: await deps.passwordHasher.hash(password),
    temporaryPassword: password,
    mustChangePassword: true,
    active: overrides.active ?? true,
  });
  return { email, password };
}

describe("login", () => {
  it("creates a session for a physician with correct credentials", async () => {
    const deps = buildDeps();
    const { email, password } = await seedCredential(deps);

    const session = await login(deps)({ email, password });

    expect(session.userType).toBe("physician");
    expect(session.physicianId).toBe("physician-1");
    expect(session.residentId).toBeNull();
    const found = await deps.sessionRepository.findById(session.id);
    expect(found?.physicianId).toBe("physician-1");
  });

  it("rejects an unknown email", async () => {
    const deps = buildDeps();

    await expect(
      login(deps)({ email: "unknown@example.com", password: "whatever" }),
    ).rejects.toThrow(/Invalid email or password/);
  });

  it("rejects a wrong password", async () => {
    const deps = buildDeps();
    const { email } = await seedCredential(deps);

    await expect(login(deps)({ email, password: "wrong-password" })).rejects.toThrow(
      /Invalid email or password/,
    );
  });

  it("is case-insensitive on email", async () => {
    const deps = buildDeps();
    const { password } = await seedCredential(deps, { email: "ana@example.com" });

    const session = await login(deps)({ email: "ANA@EXAMPLE.com", password });

    expect(session.physicianId).toBe("physician-1");
  });

  it("allows login even when the credential is unconfirmed (ADR 0016: email confirmation paused for MVP)", async () => {
    const deps = buildDeps();
    const { email, password } = await seedCredential(deps, { confirmedAt: null });

    const session = await login(deps)({ email, password });

    expect(session.physicianId).toBe("physician-1");
  });

  it("still rejects a wrong password regardless of confirmation state", async () => {
    const deps = buildDeps();
    const { email } = await seedCredential(deps, { confirmedAt: null });

    await expect(login(deps)({ email, password: "wrong-password" })).rejects.toThrow(
      /Invalid email or password/,
    );
  });

  it("creates a session for a resident with correct credentials (ADR 0017)", async () => {
    const deps = buildDeps();
    const { email, password } = await seedResidentCredential(deps);

    const session = await login(deps)({ email, password });

    expect(session.userType).toBe("resident");
    expect(session.physicianId).toBe("physician-1");
    expect(session.residentId).toBe("resident-1");
  });

  it("rejects a resident's wrong password", async () => {
    const deps = buildDeps();
    const { email } = await seedResidentCredential(deps);

    await expect(login(deps)({ email, password: "wrong-password" })).rejects.toThrow(
      /Invalid email or password/,
    );
  });

  it("is case-insensitive on a resident's email", async () => {
    const deps = buildDeps();
    const { password } = await seedResidentCredential(deps, { email: "resident@example.com" });

    const session = await login(deps)({ email: "RESIDENT@EXAMPLE.com", password });

    expect(session.residentId).toBe("resident-1");
  });

  it("rejects a deactivated resident even with the correct password", async () => {
    const deps = buildDeps();
    const { email, password } = await seedResidentCredential(deps, { active: false });

    await expect(login(deps)({ email, password })).rejects.toThrow(/deactivated/);
  });

  it("never confuses a physician email with a resident email — the physician store is checked first", async () => {
    const deps = buildDeps();
    const { email, password } = await seedCredential(deps, { email: "shared@example.com" });
    await seedResidentCredential(deps, {
      email: "other-resident@example.com",
      password: "different-password",
    });

    const session = await login(deps)({ email, password });

    expect(session.userType).toBe("physician");
  });
});
