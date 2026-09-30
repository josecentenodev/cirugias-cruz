import { createPrismaClient } from "./src/index.js";

/**
 * Deletes one physician and everything scoped to their tenant. Lives here
 * (not in `packages/web`) so `web` keeps its documented invariant of
 * importing no workspace package — see `deployment-railway.md`'s "Watch
 * patterns" section. `packages/web/e2e/global-setup.ts` invokes this as a
 * child process (`pnpm --filter @cirugias-cruz/http exec tsx
 * ../infrastructure/e2e-cleanup.ts <physicianId>`) rather than importing
 * `createPrismaClient` directly.
 *
 * Deletion order mirrors `packages/http/src/testing/test-db.ts`'s
 * `cleanupPhysician` (children before parents; `controls.definitionId` is
 * ON DELETE RESTRICT, so controls go before control definitions). Keep
 * the two in sync when the schema gains a tenant-scoped table.
 */
async function main(): Promise<void> {
  const physicianId = process.argv[2];
  if (!physicianId) {
    console.error("Usage: tsx e2e-cleanup.ts <physicianId>");
    process.exit(1);
  }

  const prisma = createPrismaClient();
  try {
    const surgeryIds = (
      await prisma.surgery.findMany({ where: { physicianId }, select: { id: true } })
    ).map((surgery) => surgery.id);

    await prisma.researchStudySurgery.deleteMany({ where: { researchStudy: { physicianId } } });
    await prisma.researchStudy.deleteMany({ where: { physicianId } });
    await prisma.customFieldValue.deleteMany({ where: { surgeryId: { in: surgeryIds } } });
    await prisma.customFieldValue.deleteMany({
      where: { control: { surgeryId: { in: surgeryIds } } },
    });
    await prisma.surgeryParticipant.deleteMany({ where: { surgeryId: { in: surgeryIds } } });
    await prisma.control.deleteMany({ where: { surgeryId: { in: surgeryIds } } });
    await prisma.surgery.deleteMany({ where: { id: { in: surgeryIds } } });
    await prisma.customFieldDefinition.deleteMany({ where: { procedureType: { physicianId } } });
    await prisma.controlDefinition.deleteMany({ where: { procedureType: { physicianId } } });
    await prisma.patient.deleteMany({ where: { physicianId } });
    await prisma.procedureType.deleteMany({ where: { physicianId } });
    await prisma.session.deleteMany({ where: { physicianId } });
    await prisma.residentInvitationToken.deleteMany({ where: { resident: { physicianId } } });
    await prisma.residentCredential.deleteMany({ where: { physicianId } });
    await prisma.resident.deleteMany({ where: { physicianId } });
    await prisma.emailConfirmationToken.deleteMany({ where: { physicianId } });
    await prisma.physicianCredential.deleteMany({ where: { physicianId } });
    await prisma.physician.deleteMany({ where: { id: physicianId } });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
