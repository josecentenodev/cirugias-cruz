import { expect, test } from "@playwright/test";

/**
 * Milestone 8's own scripted browser-level walkthrough (Measurable
 * completion criteria). One continuous session, mirroring the manual
 * verification performed after each vertical slice during
 * implementation (see docs/architecture/ROADMAP.md's Milestone 8
 * entry) — not a replacement for it, the first time it's been made
 * scripted and reproducible.
 *
 * Runs against a real `web` + `api` + Postgres stack end to end
 * (`playwright.config.ts`'s own comment explains the two base URLs).
 * Nothing here mocks `api` — every assertion below only passes if the
 * real Domain → Application → HTTP → BFF → UI chain actually worked.
 */
test.describe.configure({ mode: "serial" });

test("full physician workflow: auth through Research Study lifecycle", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("global-setup.ts did not set PLAYWRIGHT_TEST_EMAIL/PASSWORD");
  }

  await test.step("login redirects an unauthenticated visitor, then succeeds", async () => {
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByText("No patients registered yet.")).toBeVisible();
  });

  await test.step("register a Procedure Type", async () => {
    await page.goto("/procedure-types/new");
    await page.getByLabel("Name").fill("Pterigión");
    await page.getByRole("button", { name: "Register procedure type" }).click();

    await expect(page).toHaveURL(/\/procedure-types$/);
    await expect(page.getByRole("cell", { name: "Pterigión" })).toBeVisible();
  });

  await test.step("register a Patient", async () => {
    await page.goto("/patients/new");
    await page.getByLabel("First name").fill("Juan");
    await page.getByLabel("Last name").fill("Pérez");
    await page.getByLabel("Phone").fill("+54 11 4444-1111");
    await page.getByLabel("Email").fill("juan.perez@example.com");
    await page.getByLabel("Date of birth").fill("1990-05-20");
    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(page.getByRole("heading", { name: "Juan Pérez" })).toBeVisible();
  });

  await test.step("register a Surgery, verify it appears in the list", async () => {
    await page.goto("/surgeries/new");
    await page.getByLabel("Patient").selectOption({ label: "Juan Pérez" });
    await page.getByLabel("Procedure type").selectOption({ label: "Pterigión" });
    await page.getByLabel("Performed date").fill("2026-08-15");
    await page.getByRole("button", { name: "Register surgery" }).click();

    await expect(page.getByRole("heading", { name: "Juan Pérez" })).toBeVisible();
    const surgeryUrl = page.url();

    await page.goto("/surgeries");
    await expect(page.getByRole("cell", { name: "Pterigión" })).toBeVisible();

    await page.goto(surgeryUrl);
  });

  await test.step("record a Control, then modify it inline", async () => {
    await page.getByLabel("Observations").fill("Evolución favorable");
    await page.getByLabel("Date & time").fill("2026-08-15T09:30");
    await page.getByRole("button", { name: "Record control" }).click();

    await expect(page.getByText("Evolución favorable")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("textbox").first().fill("Evolución favorable, sin complicaciones");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Evolución favorable, sin complicaciones")).toBeVisible();
  });

  await test.step("register a Resident and assign them to the Surgery", async () => {
    await page.goto("/residents/new");
    await page.getByLabel("First name").fill("Laura");
    await page.getByLabel("Last name").fill("Díaz");
    await page.getByLabel("Phone").fill("+54 11 3333-3333");
    await page.getByLabel("Email").fill("laura.diaz@example.com");
    await page.getByLabel("Date of birth").fill("1995-02-02");
    await page.getByRole("button", { name: "Register resident" }).click();

    await expect(page.getByRole("cell", { name: "Laura Díaz" })).toBeVisible();

    await page.goto("/surgeries");
    // The patient's name is the surgery row's link — "Pterigión" itself is plain text.
    await page.getByRole("link", { name: "Juan Pérez" }).click();

    await page.getByLabel("Resident to assign").selectOption({ label: "Laura Díaz" });
    await page.getByRole("button", { name: "Assign" }).click();

    await expect(page.getByText("Laura Díaz")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  });

  await test.step("create a Research Study and add the Surgery to it", async () => {
    await page.goto("/research-studies/new");
    await page
      .getByLabel("Hypothesis")
      .fill("Pterygium recurrence rates after conjunctival autografting");
    await page.getByRole("button", { name: "Register study" }).click();

    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    await page
      .getByLabel("Surgery to add")
      .selectOption({ label: "Juan Pérez — Pterigión (Aug 15, 2026)" });
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  });

  await test.step("edit the study's fields inline", async () => {
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Results").fill("Preliminary chart review of 40 cases.");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Preliminary chart review of 40 cases.")).toBeVisible();
  });

  await test.step("drive the lifecycle: DRAFT -> IN_PROGRESS -> COMPLETED, verifying UI restrictions", async () => {
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("In progress", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();

    // Completed: Edit/Remove/Add are all hidden — a completed study's
    // fields and surgery universe are locked (ResearchStudy.assertModifiable).
    await expect(page.getByRole("button", { name: "Edit" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).not.toBeVisible();
    await expect(page.getByText("A completed study's surgery universe is locked")).toBeVisible();
  });

  await test.step("reopen the study — editing and removal become available again", async () => {
    await page.getByRole("button", { name: "Reopen" }).click();

    await expect(page.getByText("In progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  });

  await test.step("logout, then confirm a protected route redirects to /login", async () => {
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login$/);
  });
});
