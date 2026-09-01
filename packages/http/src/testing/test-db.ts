import "dotenv/config";
import { createPrismaClient } from "@cirugias-cruz/infrastructure";

/** Shared Prisma client for e2e tests, plus cleanup keyed by physicianId. */
export const testPrisma = createPrismaClient();

export async function cleanupPhysician(physicianId: string): Promise<void> {
  const surgeries = await testPrisma.surgery.findMany({
    where: { physicianId },
    select: { id: true },
  });
  const surgeryIds = surgeries.map((s) => s.id);
  if (surgeryIds.length > 0) {
    await testPrisma.surgeryParticipant.deleteMany({ where: { surgeryId: { in: surgeryIds } } });
    await testPrisma.control.deleteMany({ where: { surgeryId: { in: surgeryIds } } });
    await testPrisma.surgery.deleteMany({ where: { id: { in: surgeryIds } } });
  }
  await testPrisma.patient.deleteMany({ where: { physicianId } });
  await testPrisma.procedureType.deleteMany({ where: { physicianId } });
  await testPrisma.resident.deleteMany({ where: { physicianId } });
  await testPrisma.session.deleteMany({ where: { physicianId } });
  await testPrisma.physicianCredential.deleteMany({ where: { physicianId } });
  await testPrisma.physician.deleteMany({ where: { id: physicianId } });
}
