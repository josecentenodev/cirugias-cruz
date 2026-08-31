import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../build-app.js";
import { buildDeps } from "../index.js";
import { cleanupPhysician } from "../testing/test-db.js";

const physicianIds: string[] = [];

afterEach(async () => {
  await Promise.all(physicianIds.splice(0).map((id) => cleanupPhysician(id)));
});

async function registerAndLogin(app: Awaited<ReturnType<typeof buildApp>>) {
  const email = `physician-${randomUUID()}@example.com`;
  const registerResponse = await app.inject({
    method: "POST",
    url: "/physicians",
    payload: {
      firstName: "Ana",
      lastName: "García",
      phone: "555-0101",
      email,
      dateOfBirth: "1980-01-01",
      password: "s3cret-password",
    },
  });
  const physicianId = registerResponse.json<{ physicianId: string }>().physicianId;
  physicianIds.push(physicianId);

  const loginResponse = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: { email, password: "s3cret-password" },
  });
  const sessionId = loginResponse.cookies.find((c) => c.name === "session_id")?.value as string;

  return { physicianId, sessionId };
}

describe("Core loop over real HTTP, authenticated, against real Postgres", () => {
  it("registers a patient, a procedure type, a surgery, and records/modifies a control — end to end", async () => {
    const app = await buildApp(buildDeps());
    const { sessionId } = await registerAndLogin(app);
    const cookies = { session_id: sessionId };

    const patientResponse = await app.inject({
      method: "POST",
      url: "/patients",
      cookies,
      payload: {
        firstName: "Juan",
        lastName: "Pérez",
        phone: "555-0202",
        email: "juan@example.com",
        dateOfBirth: "1990-05-15",
      },
    });
    expect(patientResponse.statusCode).toBe(201);
    const { patientId } = patientResponse.json<{ patientId: string }>();

    const procedureTypeResponse = await app.inject({
      method: "POST",
      url: "/procedure-types",
      cookies,
      payload: { name: "Pterigión", technique: "Conjunctival autograft" },
    });
    expect(procedureTypeResponse.statusCode).toBe(201);
    const { procedureTypeId } = procedureTypeResponse.json<{ procedureTypeId: string }>();

    const surgeryResponse = await app.inject({
      method: "POST",
      url: "/surgeries",
      cookies,
      payload: { patientId, procedureTypeId, performedAt: "2026-01-10" },
    });
    expect(surgeryResponse.statusCode).toBe(201);
    const { surgeryId } = surgeryResponse.json<{ surgeryId: string }>();

    const controlResponse = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/controls`,
      cookies,
      payload: {
        observations: "Sin signos de infección",
        recordedAt: "2026-01-11",
        author: { type: "physician" },
      },
    });
    expect(controlResponse.statusCode).toBe(201);
    const { controlId } = controlResponse.json<{ controlId: string }>();

    const modifyResponse = await app.inject({
      method: "PATCH",
      url: `/surgeries/${surgeryId}/controls/${controlId}`,
      cookies,
      payload: { observations: "Evolución favorable" },
    });
    expect(modifyResponse.statusCode).toBe(200);
  });

  it("keeps tenant isolation: a physician's session cannot record a control on another physician's surgery", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);

    const patientResponse = await app.inject({
      method: "POST",
      url: "/patients",
      cookies: { session_id: owner.sessionId },
      payload: {
        firstName: "Juan",
        lastName: "Pérez",
        phone: "555-0202",
        email: "juan2@example.com",
        dateOfBirth: "1990-05-15",
      },
    });
    const { patientId } = patientResponse.json<{ patientId: string }>();

    const procedureTypeResponse = await app.inject({
      method: "POST",
      url: "/procedure-types",
      cookies: { session_id: owner.sessionId },
      payload: { name: "Pterigión" },
    });
    const { procedureTypeId } = procedureTypeResponse.json<{ procedureTypeId: string }>();

    const surgeryResponse = await app.inject({
      method: "POST",
      url: "/surgeries",
      cookies: { session_id: owner.sessionId },
      payload: { patientId, procedureTypeId, performedAt: "2026-01-10" },
    });
    const { surgeryId } = surgeryResponse.json<{ surgeryId: string }>();

    const intruderAttempt = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/controls`,
      cookies: { session_id: intruder.sessionId },
      payload: {
        observations: "attempt",
        recordedAt: "2026-01-11",
        author: { type: "physician" },
      },
    });

    expect(intruderAttempt.statusCode).toBe(400);
  });
});
