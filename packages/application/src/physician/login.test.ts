import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  InMemoryPhysicianCredentialRepository,
  InMemorySessionRepository,
} from "../testing/fakes.js";
import { login } from "./login.js";

function buildDeps() {
  return {
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
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

describe("login", () => {
  it("creates a session for a physician with correct credentials", async () => {
    const deps = buildDeps();
    const { email, password } = await seedCredential(deps);

    const session = await login(deps)({ email, password });

    expect(session.physicianId).toBe("physician-1");
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

  it("rejects an unconfirmed credential, even with the correct password (ADR 0015)", async () => {
    const deps = buildDeps();
    const { email, password } = await seedCredential(deps, { confirmedAt: null });

    await expect(login(deps)({ email, password })).rejects.toThrow(/confirm your email/);
  });

  it("still rejects a wrong password before checking confirmation, so it never leaks confirmation status", async () => {
    const deps = buildDeps();
    const { email } = await seedCredential(deps, { confirmedAt: null });

    await expect(login(deps)({ email, password: "wrong-password" })).rejects.toThrow(
      /Invalid email or password/,
    );
  });
});
