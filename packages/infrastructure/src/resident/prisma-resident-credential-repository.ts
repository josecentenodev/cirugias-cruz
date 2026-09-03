import type { ResidentCredential, ResidentCredentialRepository } from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

export class PrismaResidentCredentialRepository implements ResidentCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<ResidentCredential | null> {
    const row = await this.prisma.residentCredential.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
    });
    if (!row) {
      return null;
    }
    return toResidentCredential(row);
  }

  async findByResidentId(residentId: string): Promise<ResidentCredential | null> {
    const row = await this.prisma.residentCredential.findUnique({ where: { residentId } });
    if (!row) {
      return null;
    }
    return toResidentCredential(row);
  }

  async save(credential: ResidentCredential): Promise<void> {
    await this.prisma.residentCredential.upsert({
      where: { residentId: credential.residentId },
      create: {
        residentId: credential.residentId,
        physicianId: credential.physicianId,
        email: credential.email,
        emailNormalized: normalizeEmail(credential.email),
        passwordHash: credential.passwordHash,
        temporaryPassword: credential.temporaryPassword,
        mustChangePassword: credential.mustChangePassword,
        active: credential.active,
      },
      update: {
        email: credential.email,
        emailNormalized: normalizeEmail(credential.email),
        passwordHash: credential.passwordHash,
        temporaryPassword: credential.temporaryPassword,
        mustChangePassword: credential.mustChangePassword,
        active: credential.active,
      },
    });
  }

  async recordPasswordChange(residentId: string, passwordHash: string): Promise<void> {
    await this.prisma.residentCredential.update({
      where: { residentId },
      data: { passwordHash, temporaryPassword: null, mustChangePassword: false },
    });
  }

  async reissueTemporaryPassword(
    residentId: string,
    temporaryPassword: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.residentCredential.update({
      where: { residentId },
      data: { passwordHash, temporaryPassword, mustChangePassword: true },
    });
  }

  async setActive(residentId: string, active: boolean): Promise<void> {
    await this.prisma.residentCredential.update({ where: { residentId }, data: { active } });
  }
}

function toResidentCredential(row: {
  residentId: string;
  physicianId: string;
  email: string;
  passwordHash: string;
  temporaryPassword: string | null;
  mustChangePassword: boolean;
  active: boolean;
}): ResidentCredential {
  return {
    residentId: row.residentId,
    physicianId: row.physicianId,
    email: row.email,
    passwordHash: row.passwordHash,
    temporaryPassword: row.temporaryPassword,
    mustChangePassword: row.mustChangePassword,
    active: row.active,
  };
}
