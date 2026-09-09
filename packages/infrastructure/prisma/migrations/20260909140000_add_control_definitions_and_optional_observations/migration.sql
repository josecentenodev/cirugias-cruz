-- ADR 0026 / 0027 (Milestone 11 WP3): control definitions live inside the
-- ProcedureType scheme; a Control may reference one and may carry no
-- observations (A4/F-08).

-- CreateTable
CREATE TABLE "control_definitions" (
    "id" TEXT NOT NULL,
    "procedureTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occurrenceMode" TEXT NOT NULL,
    "occurrenceCount" INTEGER,
    "occurrencePeriodEvery" INTEGER,
    "occurrencePeriodUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "control_definitions_procedureTypeId_idx" ON "control_definitions"("procedureTypeId");

-- AddForeignKey
ALTER TABLE "control_definitions" ADD CONSTRAINT "control_definitions_procedureTypeId_fkey" FOREIGN KEY ("procedureTypeId") REFERENCES "procedure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Control.definitionId (nullable id-only reference) + Control.observations becomes nullable
ALTER TABLE "controls" ADD COLUMN "definitionId" TEXT;
ALTER TABLE "controls" ALTER COLUMN "observations" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "controls_definitionId_idx" ON "controls"("definitionId");

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "control_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
