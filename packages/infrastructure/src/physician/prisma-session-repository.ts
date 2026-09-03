import { randomUUID } from "node:crypto";
import type { CreateSessionInput, Session, SessionRepository } from "@cirugias-cruz/application";
import type { PrismaClient } from "@prisma/client";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — no requirement yet for a different lifetime.

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userType: input.userType,
      physicianId: input.physicianId,
      residentId: input.userType === "resident" ? input.residentId : null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    };
    await this.prisma.session.create({
      data: {
        id: session.id,
        userType: session.userType,
        physicianId: session.physicianId,
        residentId: session.residentId,
        expiresAt: session.expiresAt,
      },
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
    return toSession(row);
  }

  async delete(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async deleteByResidentId(residentId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { residentId } });
  }
}

function toSession(row: {
  id: string;
  userType: string;
  physicianId: string;
  residentId: string | null;
  expiresAt: Date;
}): Session {
  if (row.userType !== "physician" && row.userType !== "resident") {
    throw new Error(`Corrupt session row: unknown userType "${row.userType}"`);
  }
  return {
    id: row.id,
    userType: row.userType,
    physicianId: row.physicianId,
    residentId: row.residentId,
    expiresAt: row.expiresAt,
  };
}
