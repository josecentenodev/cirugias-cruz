# 0023 — Product name is "Seguimiento de Cirugías"; the "Epitaxy" codename is retired

## Status

Accepted (current iteration). Names the product for users. Supersedes the
internal codename "Epitaxy" used across docs and UI copy since domain
discovery. No amendment to any behavioral ADR.

## Context

The project was developed under the codename **Epitaxy**. It appeared as
the wordmark in `packages/web`, the `<title>`, the confirmation-email
sender and copy, the project skill name, and throughout `docs/`.

The custom domain **`seguimientocirugias.com`** is live and is the name
prospective physician-customers actually encounter. The product owner's
call: the codename communicates nothing to that audience and would need
explaining every time — "nadie quiere perder su tiempo leyendo historias
que no vienen al caso". A descriptive name that matches the domain is
worth more than an evocative one nobody can place.

## Decision

- The product's user-facing name is **"Seguimiento de Cirugías"**
  (title case, with the accent), matching the live domain
  `seguimientocirugias.com`.
- "Epitaxy" is **retired** — removed from every user-facing string
  (`web` wordmark and `<title>`, auth-card titles, confirmation-email
  subject/body, the `RESEND_FROM_EMAIL` fallback) and from `docs/`
  prose that names the product in the present tense.
- **Internal identifiers deliberately keep `cirugias-cruz`**: the git
  repository, the pnpm workspace scope `@cirugias-cruz/*`, package
  names, the Railway project/service names, and database identifiers are
  **not** renamed. They are not seen by end users, and churning them
  carries deployment/DNS/CI risk for zero user benefit. `cirugias-cruz`
  is simply the internal slug for the product now called "Seguimiento de
  Cirugías".
- The project context skill was renamed `epitaxy-project` →
  `seguimiento-cirugias-project` (content updated in the same change).

## Consequences

- Purely cosmetic at the code level — strings only. No Domain,
  Application, Infrastructure, HTTP, schema, or route change. Verified by
  the existing quality gate (no test asserted the codename; the two
  Resend fixtures that used it as sample data were updated for
  consistency).
- Historical ADR prose that describes _past_ state may still read
  "Epitaxy" where changing it would misrepresent the record; all
  present-tense product references were updated.
- Future docs and UI copy use "Seguimiento de Cirugías". The
  `seguimiento-cirugias-project` skill is the canonical project index.

## Not decided here

- A logo / visual wordmark treatment beyond plain text — see
  [ADR 0024](0024-visual-design-direction.md) and
  `docs/design/design-system.md`.
- Any legal-entity, trademark, or marketing-site naming — out of scope
  for the application.
