# 0009 — Physician is the Tenant; shared person shape

## Status
Established (current iteration).

## Decision
The Physician *is* the Tenant — there is no separate conceptual
distinction between "Physician" and "Tenant" in the product model.

Physician, Resident, and Patient share a base personal-information shape:

- `firstName` — required
- `lastName` — required
- `phone` — required
- `email` — required
- `dateOfBirth` — required
- `metadata` — optional

Patient additionally has `observations` (optional). Physician and Resident
do not have `observations`.

## Rationale
Physician and Resident are both people and require the same basic
personal information; modeling them with duplicated, inconsistent shapes
would misrepresent the domain. Collapsing Physician/Tenant into one
concept reflects that tenancy in this product is defined by "whose
workspace this is," not by a separate organizational entity.

## Not decided here
- Whether Physician/Resident/Patient should share an implementation-level
  base type — that is a modeling decision for the implementation phase,
  not a business decision.
