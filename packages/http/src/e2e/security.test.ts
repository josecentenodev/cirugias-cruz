import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  FakeEmailSender,
  FakePasswordHasher,
  InMemoryEmailConfirmationTokenRepository,
  InMemoryPatientRepository,
  InMemoryPhysicianCredentialRepository,
  InMemoryPhysicianRepository,
  InMemoryProcedureTypeRepository,
  InMemoryResearchStudyRepository,
  InMemoryResidentRepository,
  InMemorySessionRepository,
  InMemorySurgeryRepository,
} from "@cirugias-cruz/application/src/testing/fakes.js";
import { buildApp } from "../build-app.js";
import type { AppDeps } from "../deps.js";

/**
 * Security/operational-hardening tests for Milestone 7. Entirely an
 * HTTP-adapter concern (validation, rate limiting, headers, health) — no
 * real Postgres needed, so this suite builds the app against in-memory
 * fakes rather than `testing/test-db.ts`.
 */
function buildTestDeps(): AppDeps {
  return {
    physicianRepository: new InMemoryPhysicianRepository(),
    physicianCredentialRepository: new InMemoryPhysicianCredentialRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionRepository: new InMemorySessionRepository(),
    emailConfirmationTokenRepository: new InMemoryEmailConfirmationTokenRepository(),
    emailSender: new FakeEmailSender(),
    patientRepository: new InMemoryPatientRepository(),
    procedureTypeRepository: new InMemoryProcedureTypeRepository(),
    surgeryRepository: new InMemorySurgeryRepository(),
    residentRepository: new InMemoryResidentRepository(),
    researchStudyRepository: new InMemoryResearchStudyRepository(),
    webBaseUrl: "http://localhost:3001",
  };
}

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

describe("GET /health", () => {
  it("returns 200 without authentication", async () => {
    const app = await buildApp(buildTestDeps());

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("Security response headers", () => {
  it("includes the standard security headers set by helmet", async () => {
    const app = await buildApp(buildTestDeps());

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-dns-prefetch-control"]).toBeDefined();
    expect(response.headers["x-frame-options"]).toBeDefined();
  });
});

describe("Request validation", () => {
  it("rejects a malformed POST /physicians body with a clean 400, not a 500", async () => {
    const app = await buildApp(buildTestDeps());

    const response = await app.inject({
      method: "POST",
      url: "/physicians",
      payload: { firstName: "Ana" }, // missing every other required field
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed POST /sessions body with a clean 400, not a 500", async () => {
    const app = await buildApp(buildTestDeps());

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: "a@b.com" }, // missing password
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed authenticated POST /patients body with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    expect(registerResponse.statusCode).toBe(201);
    const { physicianId } = registerResponse.json<{ physicianId: string }>();
    await deps.physicianCredentialRepository.markConfirmed(physicianId);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    const sessionId = loginResponse.cookies.find((c) => c.name === "session_id")?.value;

    const response = await app.inject({
      method: "POST",
      url: "/patients",
      payload: { firstName: "Only a first name" },
      cookies: { session_id: sessionId as string },
    });

    expect(response.statusCode).toBe(400);
  });

  /**
   * Registers and logs in a physician for tests that only need an
   * authenticated session, not the confirmation flow itself (that's
   * covered by e2e/auth.test.ts). Confirms directly via the repository
   * — these are in-memory fakes in this same process, so this is a test
   * setup shortcut, not a bypass of anything real (see ADR 0015).
   */
  async function loginNewPhysician(
    app: Awaited<ReturnType<typeof buildApp>>,
    deps: AppDeps,
  ): Promise<string> {
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    expect(registerResponse.statusCode).toBe(201);
    const { physicianId } = registerResponse.json<{ physicianId: string }>();
    await deps.physicianCredentialRepository.markConfirmed(physicianId);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email: payload.email, password: payload.password },
    });
    return loginResponse.cookies.find((c) => c.name === "session_id")?.value as string;
  }

  // Regression coverage for docs/architecture/m4-m7-conformance-review.md
  // §2.1: resident.ts and research-study.ts had zero request-body JSON
  // schemas, so a missing/malformed body reached `request.body.<field>`
  // directly and threw an uncaught TypeError, which `replyForError` could
  // only translate as a 500 — not the clean 400 Milestone 7's Definition
  // of Done requires. These prove the fix: every route in both files now
  // validates its body/params before the handler runs.
  it("rejects a POST /research-studies request with no body at all with a clean 400, not a 500", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/research-studies",
      cookies: { session_id: sessionId },
      // deliberately no `payload` — reproduces the exact missing-body case
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed POST /research-studies body (wrong field type) with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/research-studies",
      cookies: { session_id: sessionId },
      payload: { hypothesis: { nested: "object, not a string" } }, // AJV coerces number->string, but not object->string
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed PATCH /research-studies/:id body with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "PATCH",
      url: "/research-studies/some-id",
      cookies: { session_id: sessionId },
      payload: { conclusion: { not: "a string" } },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a POST /research-studies/:id/surgeries request missing surgeryId with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/research-studies/some-id/surgeries",
      cookies: { session_id: sessionId },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a POST /research-studies/:id/status request with an invalid body shape with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/research-studies/some-id/status",
      cookies: { session_id: sessionId },
      // deliberately no `payload` — `to` is required
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a POST /residents request with no body at all with a clean 400, not a 500", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/residents",
      cookies: { session_id: sessionId },
      // deliberately no `payload`
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed POST /residents body (missing required fields) with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/residents",
      cookies: { session_id: sessionId },
      payload: { firstName: "Only a first name" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a POST /surgeries/:id/residents request missing residentId with a clean 400", async () => {
    const deps = buildTestDeps();
    const app = await buildApp(deps);
    const sessionId = await loginNewPhysician(app, deps);

    const response = await app.inject({
      method: "POST",
      url: "/surgeries/some-id/residents",
      cookies: { session_id: sessionId },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("Rate limiting on POST /sessions, keyed by forwarded client IP", () => {
  it("blocks repeated attempts from the same forwarded IP after the limit, but not a different forwarded IP", async () => {
    const app = await buildApp(buildTestDeps());
    const attempt = (forwardedFor: string) =>
      app.inject({
        method: "POST",
        url: "/sessions",
        headers: { "x-forwarded-for": forwardedFor },
        payload: { email: "nobody@example.com", password: "wrong-password" },
      });

    const clientA = "203.0.113.10";
    const clientB = "203.0.113.20";

    // Exhaust client A's bucket (max 5/minute, configured in routes/auth.ts).
    const responses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const response = await attempt(clientA);
      responses.push(response.statusCode);
    }
    // All five are within the limit — each fails authentication (400), none
    // rate-limited yet.
    expect(responses.every((code) => code === 400)).toBe(true);

    const sixthFromClientA = await attempt(clientA);
    expect(sixthFromClientA.statusCode).toBe(429);

    // A different forwarded client IP must not share client A's bucket —
    // this is the specific behavior that proves the rate-limit key is the
    // forwarded IP, not something collective (e.g. the raw connection IP,
    // which every request shares in the BFF topology — see
    // src/shared/rate-limit-key.ts).
    const firstFromClientB = await attempt(clientB);
    expect(firstFromClientB.statusCode).toBe(400);
  });
});

describe("Rate limiting on POST /physicians, keyed by forwarded client IP", () => {
  it("blocks repeated registrations from the same forwarded IP after the limit", async () => {
    const app = await buildApp(buildTestDeps());
    const register = (forwardedFor: string) =>
      app.inject({
        method: "POST",
        url: "/physicians",
        headers: { "x-forwarded-for": forwardedFor },
        payload: newPhysicianPayload(),
      });

    const client = "198.51.100.5";
    for (let i = 0; i < 5; i++) {
      const response = await register(client);
      expect(response.statusCode).toBe(201);
    }

    const sixth = await register(client);
    expect(sixth.statusCode).toBe(429);
  });
});
