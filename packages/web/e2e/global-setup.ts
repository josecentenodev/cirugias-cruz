import { createPrismaClient } from "@cirugias-cruz/infrastructure";
import { registerTestPhysician } from "./test-physician.js";

/**
 * Registers one fresh test physician before the suite runs (see
 * test-physician.ts) and exposes its credentials to the spec via
 * `process.env` — set here, in the main process, before Playwright forks
 * worker processes, so every worker inherits them.
 *
 * The function this returns is Playwright's documented global-teardown
 * mechanism (see playwright.config.ts's own comment on why `web` cannot
 * self-clean via its own UI: nothing in its Scope deletes a physician).
 * Direct Prisma access is confined to `e2e/` — `packages/web/src`
 * (the shipped application) never imports `@cirugias-cruz/infrastructure`;
 * this is test-harness cleanup, not a Repository used by the app itself.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const physician = await registerTestPhysician();

  process.env.PLAYWRIGHT_TEST_EMAIL = physician.email;
  process.env.PLAYWRIGHT_TEST_PASSWORD = physician.password;

  return async function globalTeardown(): Promise<void> {
    const prisma = createPrismaClient();
    const physicianId = physician.physicianId;
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
  };
}
