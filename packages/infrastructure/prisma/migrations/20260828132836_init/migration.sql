-- CreateTable
CREATE TABLE "physicians" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_types" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "technique" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgeries" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureTypeId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "observations" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorPhysicianId" TEXT,
    "authorResidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgery_participants" (
    "surgeryId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,

    CONSTRAINT "surgery_participants_pkey" PRIMARY KEY ("surgeryId","residentId")
);

-- CreateIndex
CREATE INDEX "patients_physicianId_idx" ON "patients"("physicianId");

-- CreateIndex
CREATE INDEX "procedure_types_physicianId_idx" ON "procedure_types"("physicianId");

-- CreateIndex
CREATE INDEX "surgeries_physicianId_idx" ON "surgeries"("physicianId");

-- CreateIndex
CREATE INDEX "controls_surgeryId_idx" ON "controls"("surgeryId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_types" ADD CONSTRAINT "procedure_types_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_procedureTypeId_fkey" FOREIGN KEY ("procedureTypeId") REFERENCES "procedure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgery_participants" ADD CONSTRAINT "surgery_participants_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
