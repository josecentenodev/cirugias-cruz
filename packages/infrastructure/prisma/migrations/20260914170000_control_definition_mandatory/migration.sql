-- ADR 0030: every Control has a type; ad-hoc (typeless) controls are
-- removed. `controls.definitionId` becomes NOT NULL. The only existing
-- ad-hoc rows are pre-MVP test/demo data (confirmed by the product
-- owner, not real clinical data) — deleted rather than backfilled.

-- DropForeignKey (nullable, ON DELETE SET NULL — no longer correct once NOT NULL)
ALTER TABLE "controls" DROP CONSTRAINT "controls_definitionId_fkey";

-- Delete pre-existing ad-hoc controls (and any CustomFieldValue rows
-- that reference them) before the column can become NOT NULL.
DELETE FROM "custom_field_values" WHERE "controlId" IN (
  SELECT "id" FROM "controls" WHERE "definitionId" IS NULL
);
DELETE FROM "controls" WHERE "definitionId" IS NULL;

-- AlterTable
ALTER TABLE "controls" ALTER COLUMN "definitionId" SET NOT NULL;

-- AddForeignKey (RESTRICT, matching every other required-relation FK in this schema)
ALTER TABLE "controls" ADD CONSTRAINT "controls_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "control_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
