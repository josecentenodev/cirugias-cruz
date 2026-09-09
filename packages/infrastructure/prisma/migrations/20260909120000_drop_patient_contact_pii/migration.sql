-- ADR 0025: Patient carries no contact PII. Phone and email were part of
-- the shared Person shape Patient used to compose; a patient is now
-- identified clinically by name, date of birth and an optional dni only.
-- No data backfill — there is no production data.
ALTER TABLE "patients" DROP COLUMN "phone";
ALTER TABLE "patients" DROP COLUMN "email";
