import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../build-app.js";
import { buildDeps } from "../index.js";
import { cleanupPhysician } from "../testing/test-db.js";

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
  const { residentId, temporaryPassword } = response.json<{
    residentId: string;
    temporaryPassword: string;
  }>();
  return { residentId, email, temporaryPassword };
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

describe("Resident authentication over real HTTP, against real Postgres (ADR 0017)", () => {
  it("issues a temporary password the physician can view repeatedly, logs the resident in, forces a password change before any other resident route, then allows it after changing", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email, temporaryPassword } = await registerResident(app, physicianCookies);

    // Physician can view the temp password repeatedly while unchanged.
    const view1 = await app.inject({
      method: "GET",
      url: `/residents/${residentId}/temporary-password`,
      cookies: physicianCookies,
    });
    expect(view1.statusCode).toBe(200);
    expect(view1.json()).toEqual({ temporaryPassword });
    const view2 = await app.inject({
      method: "GET",
      url: `/residents/${residentId}/temporary-password`,
      cookies: physicianCookies,
    });
    expect(view2.json()).toEqual({ temporaryPassword });

    // Resident logs in with it.
    const residentLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: temporaryPassword },
    });
    expect(residentLogin.statusCode).toBe(200);
    expect(residentLogin.json()).toEqual({ userType: "resident", mustChangePassword: true });
    const residentSessionId = residentLogin.cookies.find((c) => c.name === "session_id")
      ?.value as string;
    const residentCookies = { session_id: residentSessionId };

    // Blocked from the Surgery panel until they change it.
    const blockedPanel = await app.inject({
      method: "GET",
      url: "/me/surgeries",
      cookies: residentCookies,
    });
    expect(blockedPanel.statusCode).toBe(400);
    expect(blockedPanel.json<{ error: string }>().error).toMatch(/change your temporary password/);

    // Not blocked from Physician-only routes either — they're simply
    // not authenticated for those at all (401, same as no session).
    const blockedFromPhysicianRoute = await app.inject({
      method: "GET",
      url: "/patients",
      cookies: residentCookies,
    });
    expect(blockedFromPhysicianRoute.statusCode).toBe(401);

    // Changing the password is itself allowed while must-change is set.
    const changePassword = await app.inject({
      method: "PATCH",
      url: "/me/password",
      cookies: residentCookies,
      payload: { newPassword: "MyOwnPassword1" },
    });
    expect(changePassword.statusCode).toBe(204);

    // Now the Surgery panel works.
    const panelAfterChange = await app.inject({
      method: "GET",
      url: "/me/surgeries",
      cookies: residentCookies,
    });
    expect(panelAfterChange.statusCode).toBe(200);
    expect(panelAfterChange.json()).toEqual([]);

    // The temporary password stopped working; the chosen one works.
    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: temporaryPassword },
    });
    expect(oldPasswordLogin.statusCode).toBe(400);

    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "MyOwnPassword1" },
    });
    expect(newPasswordLogin.statusCode).toBe(200);
    expect(newPasswordLogin.json()).toEqual({ userType: "resident", mustChangePassword: false });

    // And the physician can no longer see a temporary password — there
    // isn't one anymore.
    const viewAfterChange = await app.inject({
      method: "GET",
      url: `/residents/${residentId}/temporary-password`,
      cookies: physicianCookies,
    });
    expect(viewAfterChange.json()).toEqual({ temporaryPassword: null });
  }, 60000);

  it("sees only the surgeries it participates in, with full control history, and can edit only its own control", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email, temporaryPassword } = await registerResident(app, physicianCookies);

    const surgeryWithResident = await registerPatientProcedureAndSurgery(app, physicianCookies);
    const surgeryWithoutResident = await registerPatientProcedureAndSurgery(app, physicianCookies);

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
      },
    });
    const { controlId: physicianControlId } = physicianControl.json<{ controlId: string }>();

    // Log in as the resident and change the forced temp password first.
    const login1 = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: temporaryPassword },
    });
    const residentCookies = {
      session_id: login1.cookies.find((c) => c.name === "session_id")?.value as string,
    };
    await app.inject({
      method: "PATCH",
      url: "/me/password",
      cookies: residentCookies,
      payload: { newPassword: "ResidentOwnPass1" },
    });

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

  it("blanqueo: the physician can reissue a temporary password, which re-arms the must-change rule", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email, temporaryPassword } = await registerResident(app, physicianCookies);

    const login1 = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: temporaryPassword },
    });
    await app.inject({
      method: "PATCH",
      url: "/me/password",
      cookies: { session_id: login1.cookies.find((c) => c.name === "session_id")?.value as string },
      payload: { newPassword: "FirstOwnPassword1" },
    });

    const reset = await app.inject({
      method: "POST",
      url: `/residents/${residentId}/password-reset`,
      cookies: physicianCookies,
    });
    expect(reset.statusCode).toBe(200);
    const { temporaryPassword: newTemporaryPassword } = reset.json<{ temporaryPassword: string }>();
    expect(newTemporaryPassword).not.toBe(temporaryPassword);

    // The chosen password no longer works; the fresh temporary one does,
    // and is must-change again.
    const oldOwnLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: "FirstOwnPassword1" },
    });
    expect(oldOwnLogin.statusCode).toBe(400);

    const newTempLogin = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: newTemporaryPassword },
    });
    expect(newTempLogin.statusCode).toBe(200);
    expect(newTempLogin.json()).toEqual({ userType: "resident", mustChangePassword: true });
  }, 60000);

  it("deactivating a resident blocks future logins and closes any session they currently hold", async () => {
    const app = await buildApp(buildDeps());
    const physician = await registerAndLoginPhysician(app);
    const physicianCookies = { session_id: physician.sessionId };
    const { residentId, email, temporaryPassword } = await registerResident(app, physicianCookies);

    const login1 = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { email, password: temporaryPassword },
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
      payload: { email, password: temporaryPassword },
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
      payload: { email, password: temporaryPassword },
    });
    expect(loginAfterReactivate.statusCode).toBe(200);
  }, 60000);

  it("keeps tenant isolation: a physician cannot view/reset/deactivate another tenant's resident", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLoginPhysician(app);
    const intruder = await registerAndLoginPhysician(app);
    const { residentId } = await registerResident(app, { session_id: owner.sessionId });

    const intruderCookies = { session_id: intruder.sessionId };

    const view = await app.inject({
      method: "GET",
      url: `/residents/${residentId}/temporary-password`,
      cookies: intruderCookies,
    });
    expect(view.statusCode).toBe(404);

    const reset = await app.inject({
      method: "POST",
      url: `/residents/${residentId}/password-reset`,
      cookies: intruderCookies,
    });
    expect(reset.statusCode).toBe(404);

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/residents/${residentId}/active`,
      cookies: intruderCookies,
      payload: { active: false },
    });
    expect(deactivate.statusCode).toBe(404);
  }, 60000);
});
