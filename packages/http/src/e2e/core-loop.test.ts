import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../build-app.js";
import { buildDeps } from "../index.js";
import { cleanupPhysician, testPrisma } from "../testing/test-db.js";

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
  // Registration alone does not grant a usable account (ADR 0015) — mark
  // it confirmed directly, bypassing the real email step these e2e
  // tests are not about (that flow has its own dedicated coverage).
  await testPrisma.physicianCredential.update({
    where: { physicianId },
    data: { confirmedAt: new Date() },
  });

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

  it("lists and retrieves a physician's own Patient/ProcedureType/Surgery after writing them", async () => {
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
        email: "juan-read@example.com",
        dateOfBirth: "1990-05-15",
      },
    });
    const { patientId } = patientResponse.json<{ patientId: string }>();

    const procedureTypeResponse = await app.inject({
      method: "POST",
      url: "/procedure-types",
      cookies,
      payload: { name: "Pterigión", technique: "Conjunctival autograft" },
    });
    const { procedureTypeId } = procedureTypeResponse.json<{ procedureTypeId: string }>();

    const surgeryResponse = await app.inject({
      method: "POST",
      url: "/surgeries",
      cookies,
      payload: { patientId, procedureTypeId, performedAt: "2026-01-10" },
    });
    const { surgeryId } = surgeryResponse.json<{ surgeryId: string }>();

    await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryId}/controls`,
      cookies,
      payload: {
        observations: "Sin signos de infección",
        recordedAt: "2026-01-11",
        author: { type: "physician" },
      },
    });

    const patientsList = await app.inject({ method: "GET", url: "/patients", cookies });
    expect(patientsList.statusCode).toBe(200);
    expect(patientsList.json<{ id: string }[]>().some((patient) => patient.id === patientId)).toBe(
      true,
    );

    const patientGet = await app.inject({ method: "GET", url: `/patients/${patientId}`, cookies });
    expect(patientGet.statusCode).toBe(200);
    expect(patientGet.json<{ id: string }>().id).toBe(patientId);

    const procedureTypesList = await app.inject({
      method: "GET",
      url: "/procedure-types",
      cookies,
    });
    expect(procedureTypesList.statusCode).toBe(200);
    expect(
      procedureTypesList
        .json<{ id: string }[]>()
        .some((procedureType) => procedureType.id === procedureTypeId),
    ).toBe(true);

    const procedureTypeGet = await app.inject({
      method: "GET",
      url: `/procedure-types/${procedureTypeId}`,
      cookies,
    });
    expect(procedureTypeGet.statusCode).toBe(200);
    expect(procedureTypeGet.json<{ id: string }>().id).toBe(procedureTypeId);

    const surgeriesList = await app.inject({ method: "GET", url: "/surgeries", cookies });
    expect(surgeriesList.statusCode).toBe(200);
    expect(surgeriesList.json<{ id: string }[]>().some((surgery) => surgery.id === surgeryId)).toBe(
      true,
    );

    const surgeryGet = await app.inject({ method: "GET", url: `/surgeries/${surgeryId}`, cookies });
    expect(surgeryGet.statusCode).toBe(200);
    const surgeryBody = surgeryGet.json<{ id: string; controls: { observations: string }[] }>();
    expect(surgeryBody.id).toBe(surgeryId);
    expect(surgeryBody.controls).toHaveLength(1);
    expect(surgeryBody.controls[0]?.observations).toBe("Sin signos de infección");
  });

  it("rejects a physician retrieving another physician's Patient/ProcedureType/Surgery with 404, not 403", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);
    const ownerCookies = { session_id: owner.sessionId };
    const intruderCookies = { session_id: intruder.sessionId };

    const patientResponse = await app.inject({
      method: "POST",
      url: "/patients",
      cookies: ownerCookies,
      payload: {
        firstName: "Juan",
        lastName: "Pérez",
        phone: "555-0202",
        email: "juan-tenant@example.com",
        dateOfBirth: "1990-05-15",
      },
    });
    const { patientId } = patientResponse.json<{ patientId: string }>();

    const procedureTypeResponse = await app.inject({
      method: "POST",
      url: "/procedure-types",
      cookies: ownerCookies,
      payload: { name: "Pterigión" },
    });
    const { procedureTypeId } = procedureTypeResponse.json<{ procedureTypeId: string }>();

    const surgeryResponse = await app.inject({
      method: "POST",
      url: "/surgeries",
      cookies: ownerCookies,
      payload: { patientId, procedureTypeId, performedAt: "2026-01-10" },
    });
    const { surgeryId } = surgeryResponse.json<{ surgeryId: string }>();

    const patientAttempt = await app.inject({
      method: "GET",
      url: `/patients/${patientId}`,
      cookies: intruderCookies,
    });
    expect(patientAttempt.statusCode).toBe(404);

    const procedureTypeAttempt = await app.inject({
      method: "GET",
      url: `/procedure-types/${procedureTypeId}`,
      cookies: intruderCookies,
    });
    expect(procedureTypeAttempt.statusCode).toBe(404);

    const surgeryAttempt = await app.inject({
      method: "GET",
      url: `/surgeries/${surgeryId}`,
      cookies: intruderCookies,
    });
    expect(surgeryAttempt.statusCode).toBe(404);

    const intruderPatientsList = await app.inject({
      method: "GET",
      url: "/patients",
      cookies: intruderCookies,
    });
    expect(
      intruderPatientsList.json<{ id: string }[]>().some((patient) => patient.id === patientId),
    ).toBe(false);
  });
});
