import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client for infra tests, plus cleanup helpers so tests
 * leave the database exactly as they found it. Deletion order respects
 * foreign keys: children before parents.
 */
export const testPrisma = new PrismaClient();

export async function cleanupSurgery(surgeryId: string): Promise<void> {
  await testPrisma.surgeryParticipant.deleteMany({ where: { surgeryId } });
  await testPrisma.control.deleteMany({ where: { surgeryId } });
  await testPrisma.surgery.deleteMany({ where: { id: surgeryId } });
}

export async function cleanupPatient(patientId: string): Promise<void> {
  await testPrisma.patient.deleteMany({ where: { id: patientId } });
}

export async function cleanupResident(residentId: string): Promise<void> {
  await testPrisma.session.deleteMany({ where: { residentId } });
  await testPrisma.residentCredential.deleteMany({ where: { residentId } });
  await testPrisma.resident.deleteMany({ where: { id: residentId } });
}

export async function cleanupProcedureType(procedureTypeId: string): Promise<void> {
  await testPrisma.procedureType.deleteMany({ where: { id: procedureTypeId } });
}

export async function cleanupResearchStudy(researchStudyId: string): Promise<void> {
  await testPrisma.researchStudySurgery.deleteMany({ where: { researchStudyId } });
  await testPrisma.researchStudy.deleteMany({ where: { id: researchStudyId } });
}

export async function cleanupPhysician(physicianId: string): Promise<void> {
  await testPrisma.session.deleteMany({ where: { physicianId } });
  await testPrisma.emailConfirmationToken.deleteMany({ where: { physicianId } });
  await testPrisma.physicianCredential.deleteMany({ where: { physicianId } });
  await testPrisma.physician.deleteMany({ where: { id: physicianId } });
}

export async function seedPhysician(id: string): Promise<void> {
  await testPrisma.physician.upsert({
    where: { id },
    create: {
      id,
      firstName: "Test",
      lastName: "Physician",
      phone: "555-0100",
      email: `${id}@example.com`,
      dateOfBirth: new Date("1980-01-01"),
    },
    update: {},
  });
}

export async function seedResident(id: string, physicianId: string): Promise<void> {
  await testPrisma.resident.upsert({
    where: { id },
    create: {
      id,
      physicianId,
      firstName: "Test",
      lastName: "Resident",
      phone: "555-0200",
      email: `${id}@example.com`,
      dateOfBirth: new Date("1995-01-01"),
    },
    update: {},
  });
}
