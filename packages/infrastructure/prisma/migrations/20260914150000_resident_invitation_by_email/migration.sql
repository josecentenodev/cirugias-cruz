-- ADR 0029: Resident onboarding moves from a visible temporary password
-- to an emailed invitation with acceptance. `passwordHash` becomes
-- nullable (no usable credential until accepted); `temporaryPassword`/
-- `mustChangePassword` are removed (no system-generated password is
-- ever created); `invitedAt`/`acceptedAt` are added for Physician-facing
-- status display only.

-- AlterTable
ALTER TABLE "resident_credentials"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN     "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "acceptedAt" TIMESTAMP(3),
  DROP COLUMN "temporaryPassword",
  DROP COLUMN "mustChangePassword";

-- Existing rows (created under ADR 0017) had a real password already —
-- treat them as already-accepted so no currently-working Resident login
-- is broken by this migration.
UPDATE "resident_credentials" SET "acceptedAt" = "createdAt" WHERE "passwordHash" IS NOT NULL;

-- CreateTable
CREATE TABLE "resident_invitation_tokens" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_invitation_tokens_residentId_idx" ON "resident_invitation_tokens"("residentId");

-- AddForeignKey
ALTER TABLE "resident_invitation_tokens" ADD CONSTRAINT "resident_invitation_tokens_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "resident_credentials"("residentId") ON DELETE RESTRICT ON UPDATE CASCADE;
