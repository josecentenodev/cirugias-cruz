import {
  BcryptPasswordHasher,
  PrismaPatientRepository,
  PrismaPhysicianCredentialRepository,
  PrismaPhysicianRepository,
  PrismaProcedureTypeRepository,
  PrismaResearchStudyRepository,
  PrismaResidentRepository,
  PrismaSessionRepository,
  PrismaSurgeryRepository,
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
    patientRepository: new PrismaPatientRepository(prisma),
    procedureTypeRepository: new PrismaProcedureTypeRepository(prisma),
    surgeryRepository: new PrismaSurgeryRepository(prisma),
    residentRepository: new PrismaResidentRepository(prisma),
    researchStudyRepository: new PrismaResearchStudyRepository(prisma),
  };
}

async function main(): Promise<void> {
  const app = await buildApp(buildDeps());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

export { buildApp };
