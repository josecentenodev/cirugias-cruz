import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
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
    patientRepository: new InMemoryPatientRepository(),
    procedureTypeRepository: new InMemoryProcedureTypeRepository(),
    surgeryRepository: new InMemorySurgeryRepository(),
    residentRepository: new InMemoryResidentRepository(),
    researchStudyRepository: new InMemoryResearchStudyRepository(),
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
    const app = await buildApp(buildTestDeps());
    const payload = newPhysicianPayload();
    const registerResponse = await app.inject({ method: "POST", url: "/physicians", payload });
    expect(registerResponse.statusCode).toBe(201);

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
