-- CreateTable
CREATE TABLE "research_studies" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "hypothesis" TEXT,
    "results" TEXT,
    "analysis" TEXT,
    "conclusion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_study_surgeries" (
    "researchStudyId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,

    CONSTRAINT "research_study_surgeries_pkey" PRIMARY KEY ("researchStudyId","surgeryId")
);

-- CreateIndex
CREATE INDEX "research_studies_physicianId_idx" ON "research_studies"("physicianId");

-- AddForeignKey
ALTER TABLE "research_studies" ADD CONSTRAINT "research_studies_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_study_surgeries" ADD CONSTRAINT "research_study_surgeries_researchStudyId_fkey" FOREIGN KEY ("researchStudyId") REFERENCES "research_studies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
