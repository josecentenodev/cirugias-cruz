import { createPrismaClient } from "./src/index.js";

/**
 * Marks one freshly registered test physician's email as confirmed, so
 * the Playwright suite can log in past the confirmation gate (ADR 0028)
 * without a real inbox. Test-setup only — invoked by
 * `packages/web/e2e/global-setup.ts` as a child process, same pattern and
 * reason as `e2e-cleanup.ts` (`web` imports no workspace package).
 */
async function main(): Promise<void> {
  const physicianId = process.argv[2];
  if (!physicianId) {
    console.error("Usage: tsx e2e-confirm.ts <physicianId>");
    process.exit(1);
  }

  const prisma = createPrismaClient();
  try {
    await prisma.physicianCredential.update({
      where: { physicianId },
      data: { confirmedAt: new Date() },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
