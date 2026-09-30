# Architecture Decision Records

Índice de los ADRs de `docs/decisions/`. Un ADR aceptado no se reescribe: un aprendizaje
nuevo que lo contradice es un ADR nuevo que lo amends/supersede. **Antes de tratar un ADR como
verdad actual, leé su sección `Status`** — ahí dice si fue enmendado o reemplazado (esta tabla no
lo repite para no quedar desactualizada).

| ADR                                                                         | Decisión                                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [0001](0001-tenancy-model.md)                                               | Tenancy model: physician as tenant, no global patient identity                                       |
| [0002](0002-platform-admin.md)                                              | Platform Admin: business visibility only, no clinical access                                         |
| [0003](0003-surgery-simplification.md)                                      | Surgery simplified to a single DONE state, no scheduling                                             |
| [0004](0004-controls-not-followup-entity.md)                                | Control as the domain concept; Follow-up is not an entity                                            |
| [0005](0005-customfields.md)                                                | Controlled extensibility via CustomFields                                                            |
| [0006](0006-research-lifecycle.md)                                          | Research study lifecycle: DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED                                            |
| [0007](0007-residents-optional-and-immutable-once-participated.md)          | Residents are optional; immutable once they have participated                                        |
| [0008](0008-notifications-payments-deferred.md)                             | Notifications, reminders, and payments are out of scope                                              |
| [0009](0009-physician-is-the-tenant-shared-person-shape.md)                 | Physician is the Tenant; shared person shape                                                         |
| [0010](0010-resident-participation-scoped-to-surgery.md)                    | Resident assignment is direct to the Surgery; no Resident ↔ Patient relationship                     |
| [0011](0011-procedure-type-ownership-and-no-deletion.md)                    | Procedure Type: physician-owned, never deleted                                                       |
| [0012](0012-physician-identified-by-email.md)                               | Physician is identified/authenticated via `email`; Physician creation is now in-scope                |
| [0013](0013-http-framework-fastify.md)                                      | HTTP framework is Fastify                                                                            |
| [0014](0014-frontend-nextjs-app-router-bff.md)                              | Frontend is Next.js (App Router), run as a Backend-For-Frontend                                      |
| [0015](0015-physician-self-registration-email-confirmation.md)              | Physician self-registration requires email confirmation before login (via Resend)                    |
| [0016](0016-physician-email-confirmation-paused-for-mvp.md)                 | Physician email confirmation is paused for MVP; self-registration stays                              |
| [0017](0017-resident-authentication-physician-issued-temporary-password.md) | Resident authentication: physician-issued temporary password                                         |
| [0018](0018-customfield-value-representation.md)                            | CustomField gains a value type, per-type constraints, and a scope; lives inside ProcedureType        |
| [0019](0019-customfield-persistence-schema.md)                              | CustomField persistence: normalized SQL tables, not a JSON column                                    |
| [0020](0020-customfield-unit-is-numeric-only-no-magnitude.md)               | CustomField `unit` belongs to a NUMBER field only; `magnitude` is removed                            |
| [0021](0021-patient-dni-and-search.md)                                      | Patient gains an optional, per-tenant-unique `dni`; patient search                                   |
| [0022](0022-surgical-technique-is-a-customfield.md)                         | Surgical technique is a CustomField, not a ProcedureType attribute                                   |
| [0023](0023-product-name-seguimiento-de-cirugias.md)                        | Product name is "Seguimiento de Cirugías"; the "Epitaxy" codename is retired                         |
| [0024](0024-visual-design-direction.md)                                     | Visual design direction: palette, Roboto, semantic colors, light-only                                |
| [0025](0025-patient-carries-no-contact-pii.md)                              | Patient carries no contact PII; Patient stops sharing the Person shape                               |
| [0026](0026-control-types-cap-and-measurement-period.md)                    | Control definitions with an optional recording cap and measurement period                            |
| [0027](0027-procedure-type-scheme-editable-frozen-once-used.md)             | Procedure Type schemes are editable, but a definition freezes once it has data                       |
| [0028](0028-physician-email-confirmation-reenabled.md)                      | Physician email confirmation gate is re-enabled; sending domain is verified                          |
| [0029](0029-resident-invitation-by-email.md)                                | Resident onboarding moves from a visible temporary password to an emailed invitation with acceptance |
| [0030](0030-control-definition-mandatory-no-ad-hoc-controls.md)             | Every Control has a type; ad-hoc (typeless) controls are removed                                     |
| [0031](0031-control-types-at-explicit-timepoints.md)                        | Control types may expect their recordings at explicit timepoints (e.g. days 1, 3, 7)                 |

Al agregar un ADR nuevo, sumá su fila acá — `node scripts/docs-linkcheck.mjs` lo marca huérfano si falta.
