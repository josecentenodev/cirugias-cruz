-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "residentId" TEXT,
ADD COLUMN     "userType" TEXT NOT NULL DEFAULT 'physician';

-- CreateTable
CREATE TABLE "resident_credentials" (
    "residentId" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "temporaryPassword" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resident_credentials_pkey" PRIMARY KEY ("residentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "resident_credentials_emailNormalized_key" ON "resident_credentials"("emailNormalized");

-- CreateIndex
CREATE INDEX "resident_credentials_physicianId_idx" ON "resident_credentials"("physicianId");

-- CreateIndex
CREATE INDEX "sessions_residentId_idx" ON "sessions"("residentId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_credentials" ADD CONSTRAINT "resident_credentials_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
