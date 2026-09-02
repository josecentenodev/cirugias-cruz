import { createPrismaClient } from "./src/index.js";

/**
 * Deletes one physician and everything scoped to their tenant. Lives here
 * (not in `packages/web`) so `web` keeps its documented invariant of
 * importing no workspace package — see `deployment-railway.md`'s "Watch
 * patterns" section. `packages/web/e2e/global-setup.ts` invokes this as a
 * child process (`pnpm --filter @cirugias-cruz/infrastructure exec tsx
 * e2e-cleanup.ts <physicianId>`) rather than importing `createPrismaClient`
 * directly.
 *
 * Mirrors the same deletion order used throughout this project's own
 * (previously always temporary, never committed) manual cleanup scripts —
 * this is the first time that pattern has been made permanent, since
 * Playwright needs it on every run, not just during manual verification.
 */
async function main(): Promise<void> {
  const physicianId = process.argv[2];
  if (!physicianId) {
    console.error("Usage: tsx e2e-cleanup.ts <physicianId>");
    process.exit(1);
  }

  const prisma = createPrismaClient();
  try {
    await prisma.researchStudySurgery.deleteMany({
      where: { researchStudy: { physicianId } },
    });
    await prisma.researchStudy.deleteMany({ where: { physicianId } });
    await prisma.control.deleteMany({ where: { surgery: { physicianId } } });
    await prisma.surgeryParticipant.deleteMany({ where: { surgery: { physicianId } } });
    await prisma.surgery.deleteMany({ where: { physicianId } });
    await prisma.resident.deleteMany({ where: { physicianId } });
    await prisma.patient.deleteMany({ where: { physicianId } });
    await prisma.procedureType.deleteMany({ where: { physicianId } });
    await prisma.session.deleteMany({ where: { physicianId } });
    await prisma.physicianCredential.deleteMany({ where: { physicianId } });
    await prisma.physician.delete({ where: { id: physicianId } });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
