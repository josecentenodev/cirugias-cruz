import { randomUUID } from "node:crypto";

/**
 * A fresh, unique physician per test run — never a hardcoded/shared
 * account. `web` has no self-registration UI (see playwright.config.ts's
 * own comment), so this registers directly against `api`'s
 * `POST /physicians`, which the test runner's own machine must be able
 * to reach (`PLAYWRIGHT_API_BASE_URL`, defaulting to a locally-running
 * `api` on port 3000 — `api` has no public domain by design).
 */
export interface TestPhysician {
  physicianId: string;
  email: string;
  password: string;
}

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3000";

export async function registerTestPhysician(): Promise<TestPhysician> {
  const unique = randomUUID();
  const email = `m8-e2e-${unique}@example.com`;
  const password = `e2e-${unique}`;

  const response = await fetch(`${apiBaseUrl}/physicians`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "M8",
      lastName: "E2E",
      phone: "+54 11 5555-0000",
      email,
      dateOfBirth: "1985-01-01",
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to register the test physician against ${apiBaseUrl}: ${response.status} ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { physicianId: string };
  return { physicianId: body.physicianId, email, password };
}
