import type {
  PhysicianCredential,
  PhysicianCredentialRepository,
} from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

export class PrismaPhysicianCredentialRepository implements PhysicianCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<PhysicianCredential | null> {
    const row = await this.prisma.physicianCredential.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
    });
    if (!row) {
      return null;
    }

    return {
      physicianId: row.physicianId,
      email: row.email,
      passwordHash: row.passwordHash,
      confirmedAt: row.confirmedAt,
    };
  }

  async save(credential: PhysicianCredential): Promise<void> {
    await this.prisma.physicianCredential.upsert({
      where: { physicianId: credential.physicianId },
      create: {
        physicianId: credential.physicianId,
        email: credential.email,
        emailNormalized: normalizeEmail(credential.email),
        passwordHash: credential.passwordHash,
        confirmedAt: credential.confirmedAt,
      },
      update: {
        email: credential.email,
        emailNormalized: normalizeEmail(credential.email),
        passwordHash: credential.passwordHash,
        confirmedAt: credential.confirmedAt,
      },
    });
  }

  async markConfirmed(physicianId: string): Promise<void> {
    await this.prisma.physicianCredential.update({
      where: { physicianId },
      data: { confirmedAt: new Date() },
    });
  }
}
