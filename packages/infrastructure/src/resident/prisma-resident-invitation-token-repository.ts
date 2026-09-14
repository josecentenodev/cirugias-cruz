import { randomUUID } from "node:crypto";
import type {
  ResidentInvitationToken,
  ResidentInvitationTokenRepository,
} from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

// 7 days (ADR 0029) — longer than EmailConfirmationToken's 24 hours,
// since accepting an invitation someone else initiated is reasonably
// expected to take longer than confirming a signup you just submitted.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class PrismaResidentInvitationTokenRepository implements ResidentInvitationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(residentId: string): Promise<ResidentInvitationToken> {
    const token: ResidentInvitationToken = {
      id: randomUUID(),
      residentId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    };
    await this.prisma.residentInvitationToken.create({
      data: { id: token.id, residentId: token.residentId, expiresAt: token.expiresAt },
    });
    return token;
  }

  async findById(tokenId: string): Promise<ResidentInvitationToken | null> {
    const row = await this.prisma.residentInvitationToken.findFirst({
      where: { id: tokenId, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      return null;
    }
    return { id: row.id, residentId: row.residentId, expiresAt: row.expiresAt };
  }

  async delete(tokenId: string): Promise<void> {
    await this.prisma.residentInvitationToken.deleteMany({ where: { id: tokenId } });
  }

  async deleteByResidentId(residentId: string): Promise<void> {
    await this.prisma.residentInvitationToken.deleteMany({ where: { residentId } });
  }
}
