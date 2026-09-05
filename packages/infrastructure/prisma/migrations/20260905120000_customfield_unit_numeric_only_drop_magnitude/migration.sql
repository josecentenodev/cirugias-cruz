-- ADR 0020 (amends 0018): `unit` is metadata of a NUMBER field only, so
-- it becomes nullable and is populated exclusively for NUMBER
-- definitions. `magnitude` is removed entirely — a field's clinical
-- dimension is expressed by its `name`.
ALTER TABLE "custom_field_definitions" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "custom_field_definitions" DROP COLUMN "magnitude";
UPDATE "custom_field_definitions" SET "unit" = NULL WHERE "valueType" <> 'NUMBER';
