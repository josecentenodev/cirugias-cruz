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

async function createSurgery(app: Awaited<ReturnType<typeof buildApp>>, sessionId: string) {
  const cookies = { session_id: sessionId };

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

describe("Research Study over real HTTP, authenticated, against real Postgres", () => {
  it(
    "exercises the full lifecycle: create, edit text, add/remove surgeries, DRAFT -> IN_PROGRESS -> COMPLETED -> reopen -> IN_PROGRESS, then reject editing while COMPLETED",
    { timeout: 40000 },
    async () => {
      const app = await buildApp(buildDeps());
      const { sessionId } = await registerAndLogin(app);
      const cookies = { session_id: sessionId };
      const surgeryId = await createSurgery(app, sessionId);

      const createResponse = await app.inject({
        method: "POST",
        url: "/research-studies",
        cookies,
        payload: { hypothesis: "Initial hypothesis" },
      });
      expect(createResponse.statusCode).toBe(201);
      const { researchStudyId } = createResponse.json<{ researchStudyId: string }>();

      const editResponse = await app.inject({
        method: "PATCH",
        url: `/research-studies/${researchStudyId}`,
        cookies,
        payload: { results: "Some results", analysis: "Some analysis" },
      });
      expect(editResponse.statusCode).toBe(200);
      expect(editResponse.json()).toMatchObject({
        results: "Some results",
        analysis: "Some analysis",
      });

      const addSurgeryResponse = await app.inject({
        method: "POST",
        url: `/research-studies/${researchStudyId}/surgeries`,
        cookies,
        payload: { surgeryId },
      });
      expect(addSurgeryResponse.statusCode).toBe(201);
      expect(addSurgeryResponse.json<{ surgeryIds: string[] }>().surgeryIds).toEqual([surgeryId]);

      const removeSurgeryResponse = await app.inject({
        method: "DELETE",
        url: `/research-studies/${researchStudyId}/surgeries/${surgeryId}`,
        cookies,
      });
      expect(removeSurgeryResponse.statusCode).toBe(200);
      expect(removeSurgeryResponse.json<{ surgeryIds: string[] }>().surgeryIds).toEqual([]);

      const toInProgressResponse = await app.inject({
        method: "POST",
        url: `/research-studies/${researchStudyId}/status`,
        cookies,
        payload: { to: "IN_PROGRESS" },
      });
      expect(toInProgressResponse.statusCode).toBe(200);
      expect(toInProgressResponse.json()).toMatchObject({ status: "IN_PROGRESS" });

      const toCompletedResponse = await app.inject({
        method: "POST",
        url: `/research-studies/${researchStudyId}/status`,
        cookies,
        payload: { to: "COMPLETED" },
      });
      expect(toCompletedResponse.statusCode).toBe(200);
      expect(toCompletedResponse.json()).toMatchObject({ status: "COMPLETED" });

      const editWhileCompletedResponse = await app.inject({
        method: "PATCH",
        url: `/research-studies/${researchStudyId}`,
        cookies,
        payload: { conclusion: "Should be rejected" },
      });
      expect(editWhileCompletedResponse.statusCode).toBe(400);

      const reopenResponse = await app.inject({
        method: "POST",
        url: `/research-studies/${researchStudyId}/status`,
        cookies,
        payload: { to: "IN_PROGRESS" },
      });
      expect(reopenResponse.statusCode).toBe(200);
      expect(reopenResponse.json()).toMatchObject({ status: "IN_PROGRESS" });

      const editAfterReopenResponse = await app.inject({
        method: "PATCH",
        url: `/research-studies/${researchStudyId}`,
        cookies,
        payload: { conclusion: "Now allowed" },
      });
      expect(editAfterReopenResponse.statusCode).toBe(200);
      expect(editAfterReopenResponse.json()).toMatchObject({ conclusion: "Now allowed" });

      const getResponse = await app.inject({
        method: "GET",
        url: `/research-studies/${researchStudyId}`,
        cookies,
      });
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json()).toMatchObject({
        status: "IN_PROGRESS",
        conclusion: "Now allowed",
      });

      const listResponse = await app.inject({ method: "GET", url: "/research-studies", cookies });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json<{ researchStudies: { id: string }[] }>().researchStudies).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: researchStudyId })]),
      );

      // Cannot delete outside DRAFT.
      const deleteWhileInProgressResponse = await app.inject({
        method: "DELETE",
        url: `/research-studies/${researchStudyId}`,
        cookies,
      });
      expect(deleteWhileInProgressResponse.statusCode).toBe(400);
    },
  );

  it("deletes a DRAFT study", async () => {
    const app = await buildApp(buildDeps());
    const { sessionId } = await registerAndLogin(app);
    const cookies = { session_id: sessionId };

    const createResponse = await app.inject({
      method: "POST",
      url: "/research-studies",
      cookies,
      payload: {},
    });
    const { researchStudyId } = createResponse.json<{ researchStudyId: string }>();

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/research-studies/${researchStudyId}`,
      cookies,
    });
    expect(deleteResponse.statusCode).toBe(200);

    const getResponse = await app.inject({
      method: "GET",
      url: `/research-studies/${researchStudyId}`,
      cookies,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it("keeps tenant isolation: another physician cannot read, edit, or delete a study they don't own", async () => {
    const app = await buildApp(buildDeps());
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/research-studies",
      cookies: { session_id: owner.sessionId },
      payload: { hypothesis: "Owner's hypothesis" },
    });
    const { researchStudyId } = createResponse.json<{ researchStudyId: string }>();

    const intruderGet = await app.inject({
      method: "GET",
      url: `/research-studies/${researchStudyId}`,
      cookies: { session_id: intruder.sessionId },
    });
    expect(intruderGet.statusCode).toBe(404);

    const intruderEdit = await app.inject({
      method: "PATCH",
      url: `/research-studies/${researchStudyId}`,
      cookies: { session_id: intruder.sessionId },
      payload: { hypothesis: "Hijacked" },
    });
    expect(intruderEdit.statusCode).toBe(400);

    const intruderDelete = await app.inject({
      method: "DELETE",
      url: `/research-studies/${researchStudyId}`,
      cookies: { session_id: intruder.sessionId },
    });
    expect(intruderDelete.statusCode).toBe(400);

    const ownerGet = await app.inject({
      method: "GET",
      url: `/research-studies/${researchStudyId}`,
      cookies: { session_id: owner.sessionId },
    });
    expect(ownerGet.statusCode).toBe(200);
  });
});
