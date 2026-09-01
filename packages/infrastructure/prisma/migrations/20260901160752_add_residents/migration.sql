-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "residents_physicianId_idx" ON "residents"("physicianId");

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
