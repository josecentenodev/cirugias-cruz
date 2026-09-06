import { notFound } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiNotFoundError } from "@/lib/api-errors";
import type { PatientDto } from "./dtos";

/**
 * `GET /patients` — scoped server-side to the authenticated physician's
 * tenant. `query` (optional) narrows the list by first name / last name /
 * dni, server-side (ADR 0021). Callers that need the full list for a name
 * lookup (surgery detail, research studies, patient detail) omit it.
 */
export async function listPatients(query?: string): Promise<PatientDto[]> {
  const q = query?.trim();
  return authedApiRequest<PatientDto[]>({
    method: "GET",
    path: q ? `/patients?q=${encodeURIComponent(q)}` : "/patients",
  });
}

/**
 * `GET /patients/:id`. A patient that doesn't exist, or belongs to
 * another physician's tenant (indistinguishable by design — see
 * docs/architecture/m4-m7-conformance-review.md §2.5), triggers Next's
 * `notFound()` here — the one place this mapping happens, so
 * `patients/[id]/page.tsx` doesn't need its own try/catch. See
 * docs/architecture/milestone-8-design.md §7.
 */
export async function getPatient(patientId: string): Promise<PatientDto> {
  try {
    return await authedApiRequest<PatientDto>({ method: "GET", path: `/patients/${patientId}` });
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    throw error;
  }
}
