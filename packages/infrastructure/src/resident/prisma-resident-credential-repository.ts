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
        invitedAt: credential.invitedAt,
        acceptedAt: credential.acceptedAt,
        active: credential.active,
      },
      update: {
        email: credential.email,
        emailNormalized: normalizeEmail(credential.email),
        passwordHash: credential.passwordHash,
        invitedAt: credential.invitedAt,
        acceptedAt: credential.acceptedAt,
        active: credential.active,
      },
    });
  }

  async recordPasswordChange(residentId: string, passwordHash: string): Promise<void> {
    await this.prisma.residentCredential.update({
      where: { residentId },
      data: { passwordHash },
    });
  }

  async recordInvitationAccepted(
    residentId: string,
    passwordHash: string,
    acceptedAt: Date,
  ): Promise<void> {
    await this.prisma.residentCredential.update({
      where: { residentId },
      data: { passwordHash, acceptedAt },
    });
  }

  async recordInvitationResent(residentId: string, invitedAt: Date): Promise<void> {
    await this.prisma.residentCredential.update({
      where: { residentId },
      data: { passwordHash: null, acceptedAt: null, invitedAt },
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
  passwordHash: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  active: boolean;
}): ResidentCredential {
  return {
    residentId: row.residentId,
    physicianId: row.physicianId,
    email: row.email,
    passwordHash: row.passwordHash,
    invitedAt: row.invitedAt,
    acceptedAt: row.acceptedAt,
    active: row.active,
  };
}
