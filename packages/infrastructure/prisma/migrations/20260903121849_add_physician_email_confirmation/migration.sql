-- AlterTable
ALTER TABLE "physician_credentials" ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "email_confirmation_tokens" (
    "id" TEXT NOT NULL,
    "physicianId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_confirmation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_confirmation_tokens_physicianId_idx" ON "email_confirmation_tokens"("physicianId");

-- AddForeignKey
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
