-- ADR 0022: surgical technique is modelled as a SURGERY-scoped ENUM
-- CustomField, not a ProcedureType attribute. The free-text `technique`
-- column is removed.
ALTER TABLE "procedure_types" DROP COLUMN "technique";
