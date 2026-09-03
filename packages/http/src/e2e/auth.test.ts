import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../build-app.js";
import { buildDeps } from "../index.js";
import { cleanupPhysician, testPrisma } from "../testing/test-db.js";

const physicianIds: string[] = [];

function newPhysicianPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    firstName: "Ana",
    lastName: "García",
    phone: "555-0101",
    email: `ana-${randomUUID()}@example.com`,
    dateOfBirth: "1980-01-01",
    password: "s3cret-password",
    ...overrides,
  };
}

function extractSessionCookie(response: { cookies: { name: string; value: string }[] }) {
  return response.cookies.find((c) => c.name === "session_id")?.value;
}

afterEach(async () => {
  await Promise.all(physicianIds.splice(0).map((id) => cleanupPhysician(id)));
});

describe("Physician registration and authentication (real HTTP, real DB)", () => {
  it("registers a physician without exposing the plaintext password anywhere", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();

    const response = await app.inject({ method: "POST", url: "/physicians", payload });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ physicianId: string }>();
    physicianIds.push(body.physicianId);

    const credentialRow = await testPrisma.physicianCredential.findUnique({
      where: { physicianId: body.physicianId },
    });
    expect(credentialRow?.passwordHash).not.toBe(payload.password);
  });

  it("rejects registering the same email twice, case-insensitively", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();

    const first = await app.inject({ method: "POST", url: "/physicians", payload });
    physicianIds.push(first.json<{ physicianId: string }>().physicianId);

    const second = await app.inject({
      method: "POST",
      url: "/physicians",
      payload: { ...payload, email: payload.email.toUpperCase() },
    });

    expect(second.statusCode).toBe(400);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
    physicianIds.push(physicianId);
    await testPrisma.physicianCredential.update({
      where: { physicianId },
      data: { confirmedAt: new Date() },
    });

    const goodLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    expect(goodLogin.statusCode).toBe(204);
    expect(extractSessionCookie(goodLogin)).toBeDefined();

    const badLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: "wrong-password" },
    });
    expect(badLogin.statusCode).toBe(400);
  });

  it("rejects login before the email is confirmed, then allows it after confirming via the token", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
    physicianIds.push(physicianId);

    const loginBeforeConfirm = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    expect(loginBeforeConfirm.statusCode).toBe(400);
    expect(loginBeforeConfirm.json<{ error: string }>().error).toMatch(/confirm your email/);

    // No real email was sent (RESEND_API_KEY isn't configured for this
    // test run — see routes/auth.ts's resilient-failure comment); the
    // token this test redeems is the one the confirmation email would
    // have embedded, read directly from where the operation persisted
    // it — proving the actual `POST /email-confirmations` route, not a
    // shortcut around it.
    const token = await testPrisma.emailConfirmationToken.findFirstOrThrow({
      where: { physicianId },
    });

    const confirmResponse = await app.inject({
      method: "POST",
      url: "/email-confirmations",
      payload: { token: token.id },
    });
    expect(confirmResponse.statusCode).toBe(200);
    expect(confirmResponse.json()).toEqual({ physicianId });

    const loginAfterConfirm = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    expect(loginAfterConfirm.statusCode).toBe(204);
    expect(extractSessionCookie(loginAfterConfirm)).toBeDefined();
  });

  it("rejects redeeming the same confirmation token twice", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
    physicianIds.push(physicianId);
    const token = await testPrisma.emailConfirmationToken.findFirstOrThrow({
      where: { physicianId },
    });

    const first = await app.inject({
      method: "POST",
      url: "/email-confirmations",
      payload: { token: token.id },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/email-confirmations",
      payload: { token: token.id },
    });
    expect(second.statusCode).toBe(400);
    expect(second.json<{ error: string }>().error).toMatch(/invalid or has expired/);
  });

  it("rejects an unknown confirmation token with a clean 400, not a 500", async () => {
    const app = await buildApp(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/email-confirmations",
      payload: { token: "does-not-exist" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a protected request with no session cookie", async () => {
    const app = await buildApp(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        firstName: "P",
        lastName: "L",
        phone: "1",
        email: "p@x.com",
        dateOfBirth: "2000-01-01",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects a protected request with an expired session", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
    physicianIds.push(physicianId);
    await testPrisma.physicianCredential.update({
      where: { physicianId },
      data: { confirmedAt: new Date() },
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    const sessionId = extractSessionCookie(loginResponse) as string;
    await testPrisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        firstName: "P",
        lastName: "L",
        phone: "1",
        email: "p@x.com",
        dateOfBirth: "2000-01-01",
      },
      cookies: { session_id: sessionId },
    });

    expect(response.statusCode).toBe(401);
  });

  it("invalidates the session on logout", async () => {
    const app = await buildApp(buildDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
    physicianIds.push(physicianId);
    await testPrisma.physicianCredential.update({
      where: { physicianId },
      data: { confirmedAt: new Date() },
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    const sessionId = extractSessionCookie(loginResponse) as string;

    const logoutResponse = await app.inject({
      method: "DELETE",
      url: "/sessions",
      cookies: { session_id: sessionId },
    });
    expect(logoutResponse.statusCode).toBe(204);

    const response = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        firstName: "P",
        lastName: "L",
        phone: "1",
        email: "p@x.com",
        dateOfBirth: "2000-01-01",
      },
      cookies: { session_id: sessionId },
    });
    expect(response.statusCode).toBe(401);
  });
});
