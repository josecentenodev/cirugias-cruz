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

async function registerPatientProcedureAndSurgery(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookies: Record<string, string>,
) {
  const patientResponse = await app.inject({
    method: "POST",
    url: "/patients",
    cookies,
    payload: {
      firstName: "Juan",
      lastName: "Pérez",
      phone: "555-0202",
      email: `patient-${randomUUID()}@example.com`,
      dateOfBirth: "1990-05-15",
    },
  });
  const { patientId } = patientResponse.json<{ patientId: string }>();

  const procedureTypeResponse = await app.inject({
    method: "POST",
    url: "/procedure-types",
    cookies,
    payload: { name: "Pterigión" },
  });
  const { procedureTypeId } = procedureTypeResponse.json<{ procedureTypeId: string }>();

  const surgeryResponse = await app.inject({
    method: "POST",
    url: "/surgeries",
    cookies,
    payload: { patientId, procedureTypeId, performedAt: "2026-01-10" },
  });
  return surgeryResponse.json<{ surgeryId: string }>().surgeryId;
}

describe("Resident vertical slice over real HTTP, authenticated, against real Postgres", () => {
  it("registers, assigns, records a control, rejects removal after participation, allows removal before participation, and lists", async () => {
    const app = await buildApp(buildDeps());
    const { sessionId } = await registerAndLogin(app);
    const cookies = { session_id: sessionId };

    const surgeryId = await registerPatientProcedureAndSurgery(app, cookies);

    const residentResponse = await app.inject({
      method: "POST",
      url: "/residents",
      cookies,
      payload: {
        firstName: "Laura",
        lastName: "Diaz",
        phone: "+54 11 3333-3333",
        email: `resident-${randomUUID()}@example.com`,
        dateOfBirth: "1995-02-02",
      },
    });
    expect(residentResponse.statusCode).toBe(201);
    const { residentId } = residentResponse.json<{ residentId: string }>();

    const secondResidentResponse = await app.inject({
      method: "POST",
      url: "/residents",
      cookies,
      payload: {
        firstName: "Marco",
        lastName: "Rossi",
        phone: "+54 11 4444-4444",
        email: `resident-${randomUUID()}@example.com`,
        dateOfBirth: "1993-03-03",
      },
    });
    const { residentId: residentId2 } = secondResidentResponse.json<{ residentId: string }>();

    const assignResponse = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/residents`,
      cookies,
      payload: { residentId },
    });
    expect(assignResponse.statusCode).toBe(200);

    const assignSecondResponse = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/residents`,
      cookies,
      payload: { residentId: residentId2 },
    });
    expect(assignSecondResponse.statusCode).toBe(200);

    const controlResponse = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/controls`,
      cookies,
      payload: {
        observations: "Evolución favorable",
        recordedAt: "2026-01-11",
        author: { type: "resident", residentId },
      },
    });
    expect(controlResponse.statusCode).toBe(201);

    const rejectedRemoval = await app.inject({
      method: "DELETE",
      url: `/surgeries/${surgeryId}/residents/${residentId}`,
      cookies,
    });
    expect(rejectedRemoval.statusCode).toBe(400);

    const allowedRemoval = await app.inject({
      method: "DELETE",
      url: `/surgeries/${surgeryId}/residents/${residentId2}`,
      cookies,
    });
    expect(allowedRemoval.statusCode).toBe(200);
    expect(
      allowedRemoval.json<{ participatingResidentIds: string[] }>().participatingResidentIds,
    ).not.toContain(residentId2);

    const listResponse = await app.inject({
      method: "GET",
      url: "/residents",
      cookies,
    });
    expect(listResponse.statusCode).toBe(200);
    const listedIds = listResponse.json<{ id: string }[]>().map((r) => r.id);
    expect(listedIds).toContain(residentId);
    expect(listedIds).toContain(residentId2);

    const getResponse = await app.inject({
      method: "GET",
      url: `/residents/${residentId}`,
      cookies,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json<{ id: string }>().id).toBe(residentId);
  }, 60000);

  it("keeps tenant isolation: a physician cannot assign another tenant's resident to their surgery", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);

    const surgeryId = await registerPatientProcedureAndSurgery(app, {
      session_id: owner.sessionId,
    });

    const intruderResidentResponse = await app.inject({
      method: "POST",
      url: "/residents",
      cookies: { session_id: intruder.sessionId },
      payload: {
        firstName: "Intruder",
        lastName: "Resident",
        phone: "+54 11 5555-5555",
        email: `resident-${randomUUID()}@example.com`,
        dateOfBirth: "1994-04-04",
      },
    });
    const { residentId } = intruderResidentResponse.json<{ residentId: string }>();

    const assignAttempt = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/residents`,
      cookies: { session_id: owner.sessionId },
      payload: { residentId },
    });

    expect(assignAttempt.statusCode).toBe(400);
  });

  it("does not let a physician see another tenant's resident by id", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);

    const residentResponse = await app.inject({
      method: "POST",
      url: "/residents",
      cookies: { session_id: owner.sessionId },
      payload: {
        firstName: "Laura",
        lastName: "Diaz",
        phone: "+54 11 3333-3333",
        email: `resident-${randomUUID()}@example.com`,
        dateOfBirth: "1995-02-02",
      },
    });
    const { residentId } = residentResponse.json<{ residentId: string }>();

    const getAttempt = await app.inject({
      method: "GET",
      url: `/residents/${residentId}`,
      cookies: { session_id: intruder.sessionId },
    });

    expect(getAttempt.statusCode).toBe(404);
  });
});
