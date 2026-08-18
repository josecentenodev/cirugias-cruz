# 0002 — Platform Admin: business visibility only, no clinical access

## Status

Established (current iteration).

## Decision

A Platform Admin actor exists at the platform level, representing the
product owner/operator. The Admin is not a member of any physician's
tenant.

The Admin can:

- See registered physicians/tenants.
- See platform usage metrics: number of registered physicians, number of
  surgeries, number of controls, number of research studies.
- Activate physician accounts.
- Deactivate physician accounts.
- Access information necessary to manage the business relationship with
  physicians.

The Admin must not access patient clinical information, individual
patient records, individual clinical measurements, sensitive surgery
information, individual control data, or research content.

## Rationale

Separates business/platform management from private clinical data,
consistent with the tenancy model ([0001](0001-tenancy-model.md)).
Physicians must trust that their clinical data is not visible to the
platform operator beyond aggregate usage counts.

## Not decided here

- Payment/subscription management capabilities for the Admin — explicitly
  out of scope for this iteration.
- Any exception process for support/legal access to clinical data.
- Authentication/authorization implementation for the Admin role.
