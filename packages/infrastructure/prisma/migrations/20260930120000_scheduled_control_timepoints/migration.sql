-- ADR 0031: a control type may expect its recordings at explicit
-- timepoints (e.g. days 1, 3 and 7 after surgery) instead of a fixed
-- period. Additive: existing uncapped / capped rows keep an empty list.

-- AlterTable
ALTER TABLE "control_definitions" ADD COLUMN     "occurrenceOffsets" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
