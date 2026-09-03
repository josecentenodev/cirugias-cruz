import { randomUUID } from "node:crypto";
import type {
  EmailConfirmationToken,
  EmailConfirmationTokenRepository,
} from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

// 24 hours — matches PrismaSessionRepository's SESSION_TTL_MS precedent (ADR 0015).
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class PrismaEmailConfirmationTokenRepository implements EmailConfirmationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(physicianId: string): Promise<EmailConfirmationToken> {
    const token: EmailConfirmationToken = {
      id: randomUUID(),
      physicianId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    };
    await this.prisma.emailConfirmationToken.create({
      data: { id: token.id, physicianId: token.physicianId, expiresAt: token.expiresAt },
    });
    return token;
  }

  async findById(tokenId: string): Promise<EmailConfirmationToken | null> {
    const row = await this.prisma.emailConfirmationToken.findFirst({
      where: { id: tokenId, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      return null;
    }
    return { id: row.id, physicianId: row.physicianId, expiresAt: row.expiresAt };
  }

  async delete(tokenId: string): Promise<void> {
    await this.prisma.emailConfirmationToken.deleteMany({ where: { id: tokenId } });
  }
}
