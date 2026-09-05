import { pathToFileURL } from "node:url";
import {
  BcryptPasswordHasher,
  PrismaEmailConfirmationTokenRepository,
  PrismaPatientRepository,
  PrismaPhysicianCredentialRepository,
  PrismaPhysicianRepository,
  PrismaProcedureTypeRepository,
  PrismaResearchStudyRepository,
  PrismaResidentCredentialRepository,
  PrismaResidentRepository,
  PrismaSessionRepository,
  PrismaSurgeryRepository,
  RandomTemporaryPasswordGenerator,
  ResendEmailSender,
  createPrismaClient,
} from "@cirugias-cruz/infrastructure";
import { buildApp } from "./build-app.js";
import type { AppDeps } from "./deps.js";

export function buildDeps(): AppDeps {
  const prisma = createPrismaClient();
  return {
    physicianRepository: new PrismaPhysicianRepository(prisma),
    physicianCredentialRepository: new PrismaPhysicianCredentialRepository(prisma),
    passwordHasher: new BcryptPasswordHasher(),
    sessionRepository: new PrismaSessionRepository(prisma),
    emailConfirmationTokenRepository: new PrismaEmailConfirmationTokenRepository(prisma),
    // Missing/invalid RESEND_API_KEY fails at the first actual send, not
    // at boot — the same "fail at use" philosophy DATABASE_URL already
    // follows here (Prisma doesn't validate its connection string at
    // construction either).
    emailSender: new ResendEmailSender(
      process.env.RESEND_API_KEY ?? "",
      process.env.RESEND_FROM_EMAIL ?? "Epitaxy <onboarding@resend.dev>",
    ),
    patientRepository: new PrismaPatientRepository(prisma),
    procedureTypeRepository: new PrismaProcedureTypeRepository(prisma),
    surgeryRepository: new PrismaSurgeryRepository(prisma),
    residentRepository: new PrismaResidentRepository(prisma),
    residentCredentialRepository: new PrismaResidentCredentialRepository(prisma),
    temporaryPasswordGenerator: new RandomTemporaryPasswordGenerator(),
    researchStudyRepository: new PrismaResearchStudyRepository(prisma),
    webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:3001",
  };
}

async function main(): Promise<void> {
  const app = await buildApp(buildDeps());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

// `new URL(process.argv[1], "file://")` mis-parses a Windows path
// (backslashes, a drive letter) into an invalid file:// URL, so this
// entrypoint check silently never matched on Windows — `main()` never
// ran, and `tsx src/index.ts` exited immediately with no error.
// `pathToFileURL` is Node's own cross-platform-correct conversion.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

export { buildApp };
