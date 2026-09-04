-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "procedureTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "magnitude" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "constraintMin" TEXT,
    "constraintMax" TEXT,
    "constraintMaxLength" INTEGER,
    "enumOptions" JSONB,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "controlId" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueText" TEXT,
    "valueDate" TIMESTAMP(3),
    "valueEnumOption" TEXT,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_field_definitions_procedureTypeId_idx" ON "custom_field_definitions"("procedureTypeId");

-- CreateIndex
CREATE INDEX "custom_field_values_definitionId_idx" ON "custom_field_values"("definitionId");

-- CreateIndex
CREATE INDEX "custom_field_values_surgeryId_idx" ON "custom_field_values"("surgeryId");

-- CreateIndex
CREATE INDEX "custom_field_values_controlId_idx" ON "custom_field_values"("controlId");

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_procedureTypeId_fkey" FOREIGN KEY ("procedureTypeId") REFERENCES "procedure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
