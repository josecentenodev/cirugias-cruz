# 0001 — Tenancy model: physician as tenant, no global patient identity

## Status
Established (current iteration).

## Decision
The physician is the tenant. Each physician has a completely private
workspace; data never crosses tenant boundaries.

A patient exists only within a physician's tenant. The same real-world
person may exist as independent, unrelated patient records in different
physicians' tenants — the system does not model or infer that these are
"the same person." There is no global patient identity and no
longitudinal medical history that follows a patient across physicians.

Research studies operate only over data belonging to the researching
physician's own tenant. There is no cross-physician research.

## Rationale
The product is centered on an individual physician's own surgical
practice, not on hospitals, clinics, or institutional/shared patient
records. Building a global patient identity would contradict this focus
and introduce cross-tenant data-sharing concerns that are out of scope.

## Not decided here
- Whether Admin-level tooling could ever surface aggregate, anonymized,
  cross-tenant statistics (not requested, not assumed).
- Persistence/schema implications of tenancy isolation.
