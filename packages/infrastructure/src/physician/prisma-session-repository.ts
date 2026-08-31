import { randomUUID } from "node:crypto";
import type { Session, SessionRepository } from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — no requirement yet for a different lifetime.

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(physicianId: string): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      physicianId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    };
    await this.prisma.session.create({
      data: { id: session.id, physicianId: session.physicianId, expiresAt: session.expiresAt },
    });
    return session;
  }

  async findById(sessionId: string): Promise<Session | null> {
    const row = await this.prisma.session.findFirst({
      where: { id: sessionId, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      return null;
    }
    return { id: row.id, physicianId: row.physicianId, expiresAt: row.expiresAt };
  }

  async delete(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
