# 0011 — Procedure Type: physician-owned, never deleted

## Status

Established (current iteration). Internal structure remains open.

## Decision

Procedure Types are owned and managed by the Physician within their own
tenant; only the Physician can create or modify them. They are not fixed
globally (not a fixed enum). Pterygium is the first Procedure Type.

Current initial idea (not yet closed) of what a Procedure Type may
contain: `name`, `description`, surgical technique. For Pterygium, the
initial known surgical technique options are: Conjunctival autograft,
Conjunctival autograft + MMC, Amniotic membrane, Autograft + fibrin glue.
These are documented as current domain knowledge, not assumed exhaustive.

**A Procedure Type must not be deleted.** This is an explicit business
decision.

## Rationale

Procedure Types may be referenced by historical surgeries and clinical
research; deleting one would orphan that history. No soft-delete,
archival, or replacement behavior is proposed — such lifecycle rules will
only be introduced if explicitly requested later.

## Not decided here

- The exact final Procedure Type model (whether technique is a fixed
  list, open catalog, or CustomField-driven).
- Whether the initial technique list for pterygium is exhaustive or will
  be extended after the physician meeting.
- Any modification/versioning rules for Procedure Types beyond "not
  deletable."
