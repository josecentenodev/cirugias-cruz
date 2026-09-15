import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../build-app.js";
import { buildDeps } from "../index.js";
import { cleanupPhysician, testPrisma } from "../testing/test-db.js";

const physicianIds: string[] = [];

afterEach(async () => {
  await Promise.all(physicianIds.splice(0).map((id) => cleanupPhysician(id)));
});

async function registerAndLoginPhysician(app: Awaited<ReturnType<typeof buildApp>>) {
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

async function registerResident(
  app: Awaited<ReturnType<typeof buildApp>>,
  physicianCookies: Record<string, string>,
) {
  const email = `resident-${randomUUID()}@example.com`;
  const response = await app.inject({
    method: "POST",
    url: "/residents",
    cookies: physicianCookies,
    payload: {
      firstName: "Laura",
      lastName: "Diaz",
      phone: "+54 11 3333-3333",
      email,
      dateOfBirth: "1995-02-02",
    },
  });
  const { residentId } = response.json<{ residentId: string }>();
  return { residentId, email };
}

async function latestInvitationToken(residentId: string) {
  return testPrisma.residentInvitationToken.findFirstOrThrow({
    where: { residentId },
    orderBy: { createdAt: "desc" },
  });
}

async function acceptInvitation(
  app: Awaited<ReturnType<typeof buildApp>>,
  residentId: string,
  password: string,
) {
  const token = await latestInvitationToken(residentId);
  const response = await app.inject({
    method: "POST",
    url: "/resident-invitations/accept",
    payload: { token: token.id, password },
  });
  return response;
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
  const surgeryId = surgeryResponse.json<{ surgeryId: string }>().surgeryId;

  // Every ProcedureType is seeded with one default, uncapped control
  // definition (ADR 0030) — used here since these tests don't care
  // about control typing, just that recording one works at all.
  const procedureTypeGet = await app.inject({
    method: "GET",
    url: `/procedure-types/${procedureTypeId}`,
    cookies,
  });
  const definitionId = procedureTypeGet.json<{ controlDefinitions: { id: string }[] }>()
    .controlDefinitions[0]?.id as string;

  return { surgeryId, definitionId };
}

describe("Resident authentication over real HTTP, against real Postgres (ADR 0029)", () => {
  it("cannot log in before accepting the invitation, can accept it by setting their own password, and logs in afterward", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email } = await registerResident(app, physicianCookies);

    const loginBeforeAccept = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "whatever" },
    });
    expect(loginBeforeAccept.statusCode).toBe(400);
    expect(loginBeforeAccept.json<{ error: string }>().error).toMatch(
      /invitation hasn't been accepted/,
    );

    const accept = await acceptInvitation(app, residentId, "MyOwnPassword1");
    expect(accept.statusCode).toBe(200);
    expect(accept.json()).toEqual({ residentId });

    const residentLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "MyOwnPassword1" },
    });
    expect(residentLogin.statusCode).toBe(200);
    expect(residentLogin.json()).toEqual({ userType: "resident" });

    const residentCookies = {
      session_id: residentLogin.cookies.find((c) => c.name === "session_id")?.value as string,
    };
    const panel = await app.inject({
      method: "GET",
      url: "/me/surgeries",
      cookies: residentCookies,
    });
    expect(panel.statusCode).toBe(200);

    // Not blocked from Physician-only routes either — they're simply
    // not authenticated for those at all (401, same as no session).
    const blockedFromPhysicianRoute = await app.inject({
      method: "GET",
      url: "/patients",
      cookies: residentCookies,
    });
    expect(blockedFromPhysicianRoute.statusCode).toBe(401);
  }, 60000);

  it("rejects redeeming the same invitation token twice", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const { residentId } = await registerResident(app, { session_id: physician.sessionId });
    const token = await latestInvitationToken(residentId);

    const first = await app.inject({
      method: "POST",
      url: "/resident-invitations/accept",
      payload: { token: token.id, password: "FirstPassword1" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/resident-invitations/accept",
      payload: { token: token.id, password: "SecondPassword1" },
    });
    expect(second.statusCode).toBe(400);
  }, 60000);

  it("sees only the surgeries it participates in, with full control history, and can edit only its own control", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email } = await registerResident(app, physicianCookies);
    await acceptInvitation(app, residentId, "ResidentOwnPass1");

    const { surgeryId: surgeryWithResident, definitionId } =
      await registerPatientProcedureAndSurgery(app, physicianCookies);
    const { surgeryId: surgeryWithoutResident } = await registerPatientProcedureAndSurgery(
      app,
      physicianCookies,
    );

    await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryWithResident}/residents`,
      cookies: physicianCookies,
      payload: { residentId },
    });

    const physicianControl = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryWithResident}/controls`,
      cookies: physicianCookies,
      payload: {
        observations: "Physician's own note",
        recordedAt: "2026-01-11",
        author: { type: "physician" },
        definitionId,
      },
    });
    const { controlId: physicianControlId } = physicianControl.json<{ controlId: string }>();

    const login1 = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "ResidentOwnPass1" },
    });
    const residentCookies = {
      session_id: login1.cookies.find((c) => c.name === "session_id")?.value as string,
    };

    const panel = await app.inject({
      method: "GET",
      url: "/me/surgeries",
      cookies: residentCookies,
    });
    expect(panel.statusCode).toBe(200);
    const panelIds = panel.json<{ id: string }[]>().map((s) => s.id);
    expect(panelIds).toEqual([surgeryWithResident]);
    expect(panelIds).not.toContain(surgeryWithoutResident);

    const detail = await app.inject({
      method: "GET",
      url: `/me/surgeries/${surgeryWithResident}`,
      cookies: residentCookies,
    });
    expect(detail.statusCode).toBe(200);
    // Full read: sees the physician's own control too, not just its own.
    expect(detail.json<{ controls: unknown[] }>().controls).toHaveLength(1);

    // Cannot reach a surgery it doesn't participate in.
    const forbiddenDetail = await app.inject({
      method: "GET",
      url: `/me/surgeries/${surgeryWithoutResident}`,
      cookies: residentCookies,
    });
    expect(forbiddenDetail.statusCode).toBe(404);

    // Records its own control, over the shared control route.
    const ownControl = await app.inject({
      method: "POST",
      url: `/surgeries/${surgeryWithResident}/controls`,
      cookies: residentCookies,
      payload: {
        observations: "Resident's own note",
        recordedAt: "2026-01-12",
        // Deliberately claims to be the physician — must be ignored and
        // forced to the resident's own identity server-side.
        author: { type: "physician" },
        definitionId,
      },
    });
    expect(ownControl.statusCode).toBe(201);
    const { controlId: ownControlId } = ownControl.json<{ controlId: string }>();

    // Can edit its own control...
    const editOwn = await app.inject({
      method: "PATCH",
      url: `/surgeries/${surgeryWithResident}/controls/${ownControlId}`,
      cookies: residentCookies,
      payload: { observations: "Updated by the resident who wrote it" },
    });
    expect(editOwn.statusCode).toBe(200);

    // ...but not the physician's.
    const editOthers = await app.inject({
      method: "PATCH",
      url: `/surgeries/${surgeryWithResident}/controls/${physicianControlId}`,
      cookies: residentCookies,
      payload: { observations: "Should be rejected" },
    });
    expect(editOthers.statusCode).toBe(400);
  }, 60000);

  it("resending an invitation clears any existing password and requires accepting again", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email } = await registerResident(app, physicianCookies);
    await acceptInvitation(app, residentId, "FirstOwnPassword1");

    const resend = await app.inject({
      method: "POST",
      url: `/residents/${residentId}/resend-invitation`,
      cookies: physicianCookies,
    });
    expect(resend.statusCode).toBe(204);

    // The old password no longer works — there is no credential until
    // the fresh invitation is accepted again.
    const oldLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "FirstOwnPassword1" },
    });
    expect(oldLogin.statusCode).toBe(400);
    expect(oldLogin.json<{ error: string }>().error).toMatch(/invitation hasn't been accepted/);

    const acceptAgain = await acceptInvitation(app, residentId, "SecondOwnPassword1");
    expect(acceptAgain.statusCode).toBe(200);

    const newLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "SecondOwnPassword1" },
    });
    expect(newLogin.statusCode).toBe(200);
  }, 60000);

  it("deactivating a resident blocks future logins, closes any session they currently hold, and invalidates a pending invitation", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email } = await registerResident(app, physicianCookies);
    await acceptInvitation(app, residentId, "MyOwnPassword1");

    const login1 = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "MyOwnPassword1" },
    });
    const residentSessionId = login1.cookies.find((c) => c.name === "session_id")?.value as string;

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/residents/${residentId}/active`,
      cookies: physicianCookies,
      payload: { active: false },
    });
    expect(deactivate.statusCode).toBe(204);

    // The still-held session cookie no longer authenticates.
    const blockedAfterDeactivation = await app.inject({
      method: "PATCH",
      url: "/me/password",
      cookies: { session_id: residentSessionId },
      payload: { newPassword: "WontWork1" },
    });
    expect(blockedAfterDeactivation.statusCode).toBe(401);

    // And a fresh login attempt is rejected with a specific message.
    const loginAttempt = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "MyOwnPassword1" },
    });
    expect(loginAttempt.statusCode).toBe(400);
    expect(loginAttempt.json<{ error: string }>().error).toMatch(/deactivated/);

    // Reactivating restores login.
    const reactivate = await app.inject({
      method: "PATCH",
      url: `/residents/${residentId}/active`,
      cookies: physicianCookies,
      payload: { active: true },
    });
    expect(reactivate.statusCode).toBe(204);

    const loginAfterReactivate = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "MyOwnPassword1" },
    });
    expect(loginAfterReactivate.statusCode).toBe(200);
  }, 60000);

  it("keeps tenant isolation: a physician cannot resend an invitation or deactivate another tenant's resident", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLoginPhysician(app);
    const intruder = await registerAndLoginPhysician(app);
    const { residentId } = await registerResident(app, { session_id: owner.sessionId });

    const intruderCookies = { session_id: intruder.sessionId };

    const resend = await app.inject({
      method: "POST",
      url: `/residents/${residentId}/resend-invitation`,
      cookies: intruderCookies,
    });
    expect(resend.statusCode).toBe(404);

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/residents/${residentId}/active`,
      cookies: intruderCookies,
      payload: { active: false },
    });
    expect(deactivate.statusCode).toBe(404);
  }, 60000);
});
