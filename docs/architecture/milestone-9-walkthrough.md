# Milestone 9 — Human E2E Walkthrough

> This is the script for Milestone 9's **human** validation step — the one
> stage in the whole plan that is deliberately not an automated test
> suite (see `ROADMAP.md` § Milestone 9). A designated tester (starting
> with the product owner) runs the full MVP workflow through the deployed
> product, unaided by raw HTTP calls, and records what they find in the
> Findings Log at the bottom.
>
> **Definition of Done** (from the ROADMAP): the tester can, unaided,
> register / log in / complete the full core-loop + Resident + Research
> workflow through the deployed frontend with no manual API calls, and
> zero P0 findings remain open.

---

## How to run this

- **Target**: `https://seguimientocirugias.com` (the real deployment at
  its live custom domain — not a local dev server, and not the
  `*.up.railway.app` URL). `api` stays private; you should never need to
  touch it directly. If you do, that is itself a P0 finding.
- **Browser**: whatever a real physician would use. Open the devtools
  **Console** and **Network** tabs and keep them visible the whole time —
  a red console error, a CSP violation, or a 4xx/5xx on a normal action is
  a finding even if the screen "looks fine".
- **Pace**: go slowly, act like a first-time user, and do **not** consult
  the code or these notes for how a screen "should" work — if it isn't
  obvious from the UI, that is a usability finding (severity your call).
- **Recording**: for every step, mark it ✅ (works as expected) or ❌
  (anything wrong, confusing, or ugly-enough-to-matter) and add a one-line
  note. Every ❌ becomes a row in the Findings Log with a severity.
- **Test data**: use obviously-fake data (`Test`, `Prueba`, DNIs like
  `TEST-0001`). Section 11 cleans it up. If cleanup can't remove
  something, note it — there is deliberately no delete path for several
  entities, which is expected, not a finding.

### Severity scale

| Sev    | Meaning                                                                                                    | Blocks MVP?                                        |
| ------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **P0** | Core workflow cannot be completed; data loss; auth/tenant leak; site down                                  | **Yes** — must be fixed before Milestone 9 closes  |
| **P1** | Workflow completable but with a wrong result, a broken sub-feature, or a real correctness/security concern | Triage — fix before close unless explicitly waived |
| **P2** | Confusing, awkward, or visually rough; workaround exists                                                   | No — logged for post-MVP / Milestone 10            |
| **P3** | Cosmetic / nitpick                                                                                         | No                                                 |

---

## 0. Environment sanity

| #   | Action                                             | Expected                                                                                            | ✅/❌ + note |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------ |
| 0.1 | Open `https://seguimientocirugias.com`             | Loads over **HTTPS**, no cert warning, redirects to the login screen (not a blank page or an error) |              |
| 0.2 | Check the console on that first load               | No red errors, **no CSP violation messages**                                                        |              |
| 0.3 | Check the Network tab for the page load            | All requests 200/3xx; no request goes to an `api`/backend origin directly from the browser          |              |
| 0.4 | Try a deep link while logged out, e.g. `/patients` | Redirected to login, not shown the page or an error                                                 |              |

## 1. Physician self-registration & authentication

| #   | Action                                                                                | Expected                                                                                                                                        | ✅/❌ + note |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1.1 | From the login screen, find and follow the "create account" / sign-up path            | A registration form is reachable without help                                                                                                   |              |
| 1.2 | Register a new physician with fake but well-formed data                               | Account is created; you end up logged in (email confirmation is intentionally **dormant** — you should **not** be blocked waiting for an email) |              |
| 1.3 | Note what the form does with a bad input (e.g. empty required field, malformed email) | Inline error, form keeps the other values you typed, no full-page crash                                                                         |              |
| 1.4 | Log out                                                                               | Returned to the login screen; going back/refresh does not put you back in                                                                       |              |
| 1.5 | Log in again with the new credentials                                                 | Works; lands on the dashboard                                                                                                                   |              |
| 1.6 | Log in with a wrong password 3–4 times quickly                                        | Rejected each time; after a few tries you may be rate-limited (expected). No stack trace, no 500                                                |              |
| 1.7 | Confirm the four nav sections are present                                             | **Pacientes**, **Plantilla**, **Investigaciones**, **Configuración**                                                                            |              |

## 2. Configuración — Procedure Type + CustomField definitions

> This is "set up my practice once". Do it before charting so the custom
> fields exist when you register a Surgery/Control.

| #   | Action                                                                                                                                                              | Expected                                                                                                                                                     | ✅/❌ + note |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 2.1 | Configuración → Procedure Types → create one named `Pterigión` with a description                                                                                   | Created; appears in the list with `name` + `description` only (there is **no** free-text "technique" field — that was removed, ADR 0022)                     |              |
| 2.2 | Open the `Pterigión` detail / edit screen                                                                                                                           | You can see it has a place to define **CustomFields**                                                                                                        |              |
| 2.3 | Add a CustomField: name `Técnica`, valueType **ENUM**, scope **SURGERY**, options e.g. `Autoinjerto conjuntival`, `Autoinjerto + MMC`, `Membrana amniótica`, `Otra` | Saved; the option list is preserved and shown                                                                                                                |              |
| 2.4 | Add a CustomField: name `Tamaño`, valueType **NUMBER**, scope **CONTROL**, with a **unit** (e.g. `mm`) and optional min/max                                         | Saved; the unit is shown alongside the field. There is **no** "magnitude" input (ADR 0020)                                                                   |              |
| 2.5 | Add a CustomField: valueType **TEXT**, scope **CONTROL** (e.g. `Notas de seguimiento`)                                                                              | Saved                                                                                                                                                        |              |
| 2.6 | Add a CustomField: valueType **DATE**, scope **SURGERY** (e.g. `Fecha de diagnóstico`)                                                                              | Saved                                                                                                                                                        |              |
| 2.7 | Re-open the Procedure Type detail                                                                                                                                   | All four CustomFields listed, each showing its type / scope / constraint correctly (this is the column-rendering that was a past bug — check it reads right) |              |
| 2.8 | Confirm there is no "delete Procedure Type" action                                                                                                                  | Correct — deletion does not exist on purpose                                                                                                                 |              |

## 3. Pacientes — register, de-dup, search

| #   | Action                                                           | Expected                                                                                                                 | ✅/❌ + note |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 3.1 | Pacientes → register a patient **with** a DNI (e.g. `TEST-0001`) | Created; DNI shown on the list and on the detail                                                                         |              |
| 3.2 | Register a second patient with the **same** DNI `TEST-0001`      | **Rejected** with an inline message like "a patient with this DNI already exists"; the rest of the form keeps its values |              |
| 3.3 | Register a patient **without** a DNI                             | Succeeds; DNI shows as `—` (a patient with no document is valid)                                                         |              |
| 3.4 | Register a third patient with a different DNI so you have ≥3     | Created                                                                                                                  |              |
| 3.5 | In the search box, type part of a **name** and submit            | List narrows to matches; the URL gains `?q=…`                                                                            |              |
| 3.6 | Search by part of a **DNI**                                      | Finds the patient by document number                                                                                     |              |
| 3.7 | Search for something with no match                               | "No patients match…" empty state, not a blank page                                                                       |              |
| 3.8 | Clear the search                                                 | Full list returns                                                                                                        |              |
| 3.9 | Open a patient detail                                            | Shows their data; DNI shown only when present; there is a way to get to **this patient's Surgeries** from here           |              |

## 4. Surgery — registered under its Patient

| #   | Action                                                                                                                            | Expected                                                                                                                | ✅/❌ + note |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| 4.1 | From a patient's detail, start "register a Surgery"                                                                               | Form opens; the patient is **already fixed** (no patient picker)                                                        |              |
| 4.2 | Pick `Pterigión` as the Procedure Type, set a performed date                                                                      | Accepted                                                                                                                |              |
| 4.3 | The form shows the **SURGERY-scoped** CustomFields (`Técnica` as a select, `Fecha de diagnóstico` as a date)                      | Both present; `Técnica` is a closed dropdown with exactly your option list                                              |              |
| 4.4 | Fill them and submit                                                                                                              | Surgery created; you land on the Surgery detail **nested under the patient** (URL like `/patients/<id>/surgeries/<id>`) |              |
| 4.5 | Surgery detail shows the chosen `Técnica` value and the date, plus an empty Control history and an inline "record a Control" form | All present                                                                                                             |              |
| 4.6 | Go back to the patient detail                                                                                                     | The new Surgery is listed there                                                                                         |              |
| 4.7 | Confirm there is no flat top-level "Surgeries" nav item                                                                           | Correct — Surgeries live under their Patient                                                                            |              |

## 5. Control — record & modify, with CustomField values

| #   | Action                                                                                                                   | Expected                                                                      | ✅/❌ + note |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------ |
| 5.1 | On the Surgery detail, use the inline form to record a Control: observations + a date/time                               | Created; appears in the Control history with its author = you (the physician) |              |
| 5.2 | The Control form shows the **CONTROL-scoped** CustomFields (`Tamaño` number with `mm` unit, `Notas de seguimiento` text) | Present; `Tamaño` enforces its min/max if you set them                        |              |
| 5.3 | Fill the CustomField values and save                                                                                     | Values shown on the recorded Control row                                      |              |
| 5.4 | Edit that Control (change observations and a CustomField value)                                                          | Update persists; the row reflects the new values; author unchanged            |              |
| 5.5 | Record a second Control                                                                                                  | Both show in the history, ordered sensibly                                    |              |
| 5.6 | Refresh the page                                                                                                         | Everything persists exactly as shown before the refresh                       |              |

## 6. Plantilla — Resident registration & assignment

| #   | Action                                                                                   | Expected                                                                                           | ✅/❌ + note |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| 6.1 | Plantilla → Residents → register a Resident with an email you control                    | Created; listed                                                                                    |              |
| 6.2 | Somewhere on the Resident's screen, issue / view a **temporary password**                | The temp password is shown to you (the physician) and stays readable until the Resident changes it |              |
| 6.3 | Go to a Surgery detail → assign this Resident to the Surgery                             | Resident now shows as a participant                                                                |              |
| 6.4 | Try to **remove** the Resident from that Surgery **before** they've recorded any Control | Allowed (they hadn't really participated yet)                                                      |              |
| 6.5 | Re-assign the Resident                                                                   | Participant again                                                                                  |              |

## 7. Resident's own login & scoped panel

> Do this in a separate browser / private window so you're logged in as
> the Resident without losing the physician session.

| #    | Action                                                                                                                                              | Expected                                                                                                               | ✅/❌ + note |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| 7.1  | Log in as the Resident with the temp password                                                                                                       | Accepted, but **immediately forced** to set a new password                                                             |              |
| 7.2  | Set a new password                                                                                                                                  | Succeeds; now on the Resident's own area                                                                               |              |
| 7.3  | The Resident sees a list of **only the Surgeries they participate in**                                                                              | The Surgery from 6.3 is there; nothing else                                                                            |              |
| 7.4  | That list shows **Patient name and Procedure Type name** — not raw ids                                                                              | Names, not ids (this was a past gap, since fixed — verify it)                                                          |              |
| 7.5  | Open the Surgery; the Resident can see **all** its Controls (not only their own) and a "record a Control" form with the CONTROL-scoped CustomFields | Full Control history visible; form present with custom fields                                                          |              |
| 7.6  | Record a Control as the Resident, with CustomField values                                                                                           | Created; author shows as the Resident                                                                                  |              |
| 7.7  | Try to reach a Surgery the Resident does **not** participate in (edit the URL to another Surgery id)                                                | Not found / not authorized — **no** data shown, no leak                                                                |              |
| 7.8  | Back as the physician, on that Surgery detail                                                                                                       | The Resident-authored Control from 7.6 is visible, correctly attributed                                                |              |
| 7.9  | Physician: try to **remove** the Resident from the Surgery now that they've recorded a Control                                                      | **Rejected** — once a Resident has recorded a Control they can't be removed                                            |              |
| 7.10 | Physician: **deactivate** the Resident's credential                                                                                                 | Resident's existing session is force-closed; on their next action they're logged out and the login screen explains why |              |

## 8. Investigaciones — Research Study lifecycle

| #   | Action                                                                      | Expected                                                                             | ✅/❌ + note |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
| 8.1 | Investigaciones → create a Research Study                                   | Created in **DRAFT**                                                                 |              |
| 8.2 | Edit all four text fields (hypothesis, results, analysis, conclusion)       | All save                                                                             |              |
| 8.3 | Add ≥2 Surgeries to the study's universe (they may span different patients) | Added; listed                                                                        |              |
| 8.4 | Remove one Surgery from the universe                                        | Removed                                                                              |              |
| 8.5 | Move **DRAFT → IN_PROGRESS**                                                | State changes; still fully editable (text + universe)                                |              |
| 8.6 | Move **IN_PROGRESS → COMPLETED**                                            | State changes; the study becomes **read-only** — editing text or universe is blocked |              |
| 8.7 | **Reopen** COMPLETED → IN_PROGRESS                                          | Allowed; editing works again (reopening is a permanent, intended feature)            |              |
| 8.8 | Create a second study, leave it DRAFT, **delete** it                        | Deleted (delete is allowed only in DRAFT)                                            |              |
| 8.9 | Try to delete the non-DRAFT study from 8.1                                  | Not allowed — no delete affordance, or a clean rejection                             |              |

## 9. Cross-cutting checks

| #   | Action                                                                       | Expected                                                                                                       | ✅/❌ + note |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| 9.1 | Throughout: watch the console/network                                        | No CSP violations, no unhandled 500s, no direct browser→`api` calls                                            |              |
| 9.2 | Refresh on several deep pages (patient detail, surgery detail, study detail) | Each renders correctly on a cold load (Server Components), no flash of error                                   |              |
| 9.3 | (Optional but valuable) Register a **second physician**, log in as them      | They see **none** of the first physician's patients / surgeries / residents / studies — tenant isolation holds |              |
| 9.4 | Close the tab and reopen the URL                                             | Session still valid (cookie persisted) until you explicitly log out                                            |              |
| 9.5 | Use the browser back button across a few write actions                       | No duplicate submissions, no broken state                                                                      |              |

## 10. Overall usability read

Not a checklist — a short written verdict from the tester:

- Could you complete the entire workflow **without** asking anyone how? (yes / mostly / no — detail)
- Where did you hesitate or guess?
- Anything that felt wrong for a real clinical practice (wording, ordering, missing obvious affordance)?

## 11. Cleanup

- Delete the DRAFT research study leftovers (done in 8.8).
- Deactivate any test Residents.
- Note anything you **couldn't** remove: Procedure Types, Surgeries,
  Controls, and completed/in-progress Studies have **no delete path** by
  design — that is expected, not a finding. If test data must be purged,
  it's a DB-side operation outside this walkthrough.

---

## Findings Log

> One row per ❌. Assign a severity. P0s block Milestone 9 from closing.

| ID   | Area (section #) | Severity | What happened | Repro steps | Status |
| ---- | ---------------- | -------- | ------------- | ----------- | ------ |
| F-01 |                  |          |               |             | open   |
| F-02 |                  |          |               |             | open   |
| F-03 |                  |          |               |             | open   |
| F-04 |                  |          |               |             | open   |
| F-05 |                  |          |               |             | open   |

_(add rows as needed)_

---

## Sign-off

Milestone 9 is **DONE** when this block is filled in and no P0 finding is open.

- **Tester**: ___________________________
- **Date**: ___________________________
- **Build / commit tested**: ___________________________
- **Result**: ☐ Passed — full workflow completed unaided, 0 open P0
  ☐ Passed with waivers (list waived P1s): ___________________________
  ☐ Failed — see open P0s in the Findings Log
- **Notes**: ___________________________
