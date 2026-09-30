import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The scripted browser-level walkthrough of the full physician workflow
 * (Milestone 8's measurable completion criterion), kept current with the
 * Milestone 10 IA (Surgery nested under its Patient; Settings / Staff
 * sections), Milestone 11 (capped control types, frozen schemes, ADR
 * 0026/0027/0030) and Milestone 12 (centralized form feedback: success
 * toasts, inline errors that keep what was typed).
 *
 * Runs against a real `web` + `api` + Postgres stack end to end
 * (`playwright.config.ts` explains the two base URLs). Nothing here mocks
 * `api` — every assertion only passes if the real Domain → Application →
 * HTTP → BFF → UI chain worked.
 */
test.describe.configure({ mode: "serial" });

/** The Milestone 12 success toast, wherever it lands after a redirect. */
function toast(page: Page, text: string) {
  return page.getByRole("region", { name: "Notifications" }).getByText(text);
}

/**
 * Opens a `DangerousConfirm` dialog from `trigger`, types the
 * confirmation phrase and submits.
 */
async function confirmRemoval(page: Page, trigger: Locator, phrase: string) {
  await trigger.click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("textbox").fill(phrase);
  await dialog.getByRole("button", { name: "Remove" }).click();
}

/**
 * The one-shot flash was consumed where the action happened — never left
 * behind to surface later as a stray toast on an unrelated page (seen
 * 2026-09-30: removing a row's own record redirected back to the same
 * page, the row's form unmounted, and nothing read the flash).
 */
async function expectFlashConsumed(page: Page) {
  await expect.poll(() => page.evaluate(() => document.cookie.includes("flash="))).toBe(false);
}

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
    await expect(page.getByText("No patients yet")).toBeVisible();
  });

  await test.step("register a Procedure Type", async () => {
    await page.goto("/settings/procedure-types/new");
    await page.getByLabel("Name").fill("Pterigión");
    await page.getByRole("button", { name: "Register procedure type" }).click();

    await expect(page).toHaveURL(/\/settings\/procedure-types$/);
    await expect(page.getByRole("cell", { name: "Pterigión" })).toBeVisible();
    await expect(toast(page, "Procedure type created.")).toBeVisible();
  });

  await test.step("define a capped control type on the Procedure Type (ADR 0026)", async () => {
    await page.getByRole("cell", { name: "Pterigión" }).click();
    await expect(page).toHaveURL(/\/settings\/procedure-types\/[^/]+$/);

    // Every new type is seeded with a default control type (ADR 0030), so
    // the "add" form starts folded away.
    const addControlType = page.locator("details", { hasText: "Add a control type" });
    await addControlType.locator("summary").click();
    await addControlType.getByLabel("Name").fill("Pain scale");
    await addControlType.getByLabel("Recording cap").selectOption("capped");
    await addControlType.getByLabel("Expected recordings").fill("2");
    await addControlType.getByLabel("Every").fill("24");
    await addControlType.getByRole("button", { name: "Add control type" }).click();

    await expect(page.getByRole("cell", { name: "Pain scale" })).toBeVisible();
    await expect(page.getByText("2 × every 24 hours")).toBeVisible();
    await expect(toast(page, "Control added.")).toBeVisible();
  });

  await test.step("define a control type on explicit days, surviving a rejected submit (ADR 0031)", async () => {
    const addControlType = page.locator("details", { hasText: "Add a control type" });
    await addControlType.locator("summary").click();
    await addControlType.getByLabel("Name").fill("Postop visits");
    await addControlType.getByLabel("Recording cap").selectOption("scheduled");
    await addControlType.getByLabel("Timepoints after surgery").fill("1, 3, 3");
    await addControlType.getByRole("button", { name: "Add control type" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "A timepoint cannot be listed more than once" }),
    ).toBeVisible();

    // Retry without re-picking "Recording cap": the select must have kept
    // its choice through React's post-action form reset.
    await addControlType.getByLabel("Timepoints after surgery").fill("7, 1, 3");
    await addControlType.getByRole("button", { name: "Add control type" }).click();
    await expect(page.getByText("Days 1, 3, 7 after surgery")).toBeVisible();
  });

  await test.step("removing an unused scheme definition confirms it in place (row removal toast)", async () => {
    await confirmRemoval(
      page,
      page.getByRole("row", { name: /Postop visits/ }).getByRole("button", { name: "Remove" }),
      "Postop visits",
    );
    await expect(page.getByRole("cell", { name: "Postop visits" })).toHaveCount(0);
    await expect(toast(page, "Control removed.")).toBeVisible();
    await expectFlashConsumed(page);

    const addField = page.locator("details", { hasText: "Add a custom field" });
    // Starts open while the type has no custom fields yet.
    if ((await addField.getAttribute("open")) === null) await addField.locator("summary").click();
    await addField.getByLabel("Name").fill("Temporary field");
    await addField.getByRole("button", { name: "Add custom field" }).click();
    await expect(page.getByRole("cell", { name: "Temporary field" })).toBeVisible();

    await confirmRemoval(
      page,
      page.getByRole("row", { name: /Temporary field/ }).getByRole("button", { name: "Remove" }),
      "Temporary field",
    );
    await expect(page.getByRole("cell", { name: "Temporary field" })).toHaveCount(0);
    await expect(toast(page, "Field removed.")).toBeVisible();
    await expectFlashConsumed(page);
  });

  await test.step("register a Patient", async () => {
    await page.goto("/patients/new");
    await page.getByLabel("First name").fill("Juan");
    await page.getByLabel("Last name").fill("Pérez");
    await page.getByLabel("Date of birth").fill("1990-05-20");
    await page.getByLabel("DNI (optional)").fill("30111222");
    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(page).toHaveURL(/\/patients\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Juan Pérez" })).toBeVisible();
    await expect(toast(page, "Patient registered.")).toBeVisible();
  });

  await test.step("an api rejection stays inline and keeps what was typed", async () => {
    await page.goto("/patients/new");
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Duplicada");
    await page.getByLabel("Date of birth").fill("1985-01-01");
    await page.getByLabel("DNI (optional)").fill("30111222"); // already taken above
    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "A patient with this DNI already exists" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/patients\/new$/);
    await expect(page.getByLabel("First name")).toHaveValue("Ana");
  });

  let surgeryUrl = "";
  await test.step("register a Surgery from its Patient, see it in the patient's list", async () => {
    await page.goto("/patients");
    await page.getByRole("link", { name: "Juan Pérez" }).click();
    await expect(page).toHaveURL(/\/patients\/[^/]+$/);
    const patientUrl = page.url();

    await page
      .getByRole("link", { name: /Register (the first )?surgery/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/patients\/[^/]+\/surgeries\/new$/);
    await page.getByLabel("Procedure type").selectOption({ label: "Pterigión" });
    await page.getByLabel("Performed date").fill("2026-08-15");
    await page.getByRole("button", { name: "Register surgery" }).click();

    await expect(page).toHaveURL(/\/patients\/[^/]+\/surgeries\/[^/]+$/);
    await expect(toast(page, "Surgery registered.")).toBeVisible();
    surgeryUrl = page.url();

    await page.goto(patientUrl);
    await expect(page.getByRole("cell", { name: "Pterigión" })).toBeVisible();

    await page.goto(surgeryUrl);
  });

  await test.step("record a capped Control, then modify it inline", async () => {
    await page.getByLabel("Control type").selectOption({ label: "Pain scale" });
    await page.getByLabel("Observations").fill("Evolución favorable");
    await page.getByRole("button", { name: "Now" }).click();
    await page.getByRole("button", { name: "Record control" }).click();

    await expect(page.getByText("Evolución favorable")).toBeVisible();
    // Follow-up indicator for the capped definition (ADR 0026).
    await expect(page.getByText(/1 of 2 recorded/)).toBeVisible();
    await expect(toast(page, "Control recorded.")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("textbox").first().fill("Evolución favorable, sin complicaciones");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Evolución favorable, sin complicaciones")).toBeVisible();
  });

  await test.step("the used control type is now frozen in the scheme editor (ADR 0027)", async () => {
    await page.goto("/settings/procedure-types");
    await page.getByRole("cell", { name: "Pterigión" }).click();

    const painRow = page.getByRole("row", { name: /Pain scale/ });
    await expect(painRow.getByText(/Recorded data exists/)).toBeVisible();
    await expect(painRow.getByRole("button", { name: "Edit" })).toHaveCount(0);
  });

  await test.step("register a Resident and assign them to the Surgery", async () => {
    await page.goto("/staff/residents/new");
    await page.getByLabel("First name").fill("Laura");
    await page.getByLabel("Last name").fill("Díaz");
    await page.getByLabel("Phone").fill("+54 11 3333-3333");
    await page.getByLabel("Email").fill("laura.diaz@example.com");
    await page.getByLabel("Date of birth").fill("1995-02-02");
    await page.getByRole("button", { name: "Register resident" }).click();

    await expect(page).toHaveURL(/\/staff\/residents$/);
    await expect(page.getByRole("cell", { name: "Laura Díaz" })).toBeVisible();
    await expect(toast(page, "Resident registered.")).toBeVisible();

    await page.goto(surgeryUrl);
    await page.getByLabel("Resident to assign").selectOption({ label: "Laura Díaz" });
    await page.getByRole("button", { name: "Assign" }).click();

    // Exact: the name also appears in the (closed) removal confirm dialog's copy.
    await expect(page.getByText("Laura Díaz", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(toast(page, "Resident assigned.")).toBeVisible();

    // Removing them (no control recorded yet) confirms it in place too.
    await confirmRemoval(page, page.getByRole("button", { name: "Remove" }), "Laura Díaz");
    await expect(page.getByText("No residents assigned yet.")).toBeVisible();
    await expect(toast(page, "Resident removed from the surgery.")).toBeVisible();
    await expectFlashConsumed(page);
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
    await expect(page.getByText(/surgery universe is locked/)).toBeVisible();
  });

  await test.step("reopen the study — editing and removal become available again", async () => {
    await page.getByRole("button", { name: "Reopen" }).click();

    await expect(page.getByText("In progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();

    await confirmRemoval(page, page.getByRole("button", { name: "Remove" }), "DELETE");
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
    await expect(toast(page, "Surgery removed from the study.")).toBeVisible();
    await expectFlashConsumed(page);
  });

  await test.step("logout, then confirm a protected route redirects to /login", async () => {
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login$/);
  });
});
