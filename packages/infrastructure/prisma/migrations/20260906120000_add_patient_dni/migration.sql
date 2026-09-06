-- ADR 0021: optional national-ID / document number on Patient, unique
-- per tenant when present. A standard unique index suffices — Postgres
-- treats NULLs as distinct, so dni-less patients are unconstrained.
ALTER TABLE "patients" ADD COLUMN "dni" TEXT;

CREATE UNIQUE INDEX "patients_physicianId_dni_key" ON "patients"("physicianId", "dni");
