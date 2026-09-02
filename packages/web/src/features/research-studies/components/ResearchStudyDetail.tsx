import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchStudyDetailView } from "../mappers";
import { AddSurgeryForm } from "./AddSurgeryForm";
import { DeleteResearchStudyButton } from "./DeleteResearchStudyButton";
import { RemoveSurgeryButton } from "./RemoveSurgeryButton";
import { ResearchStudyFieldsForm } from "./ResearchStudyFieldsForm";
import { StatusActions } from "./StatusActions";

/**
 * Server Component — reads are rendered directly, no client-side fetch.
 * `ResearchStudyFieldsForm`, `StatusActions`, `AddSurgeryForm`,
 * `RemoveSurgeryButton`, and `DeleteResearchStudyButton` are the only
 * Client Components nested inside. Adding/removing a Surgery lives on
 * this page, not on a Surgery-owned one, mirroring `api` itself
 * (`addSurgeryToResearchStudy`/`removeSurgeryFromResearchStudy` are
 * ResearchStudy's own operations — see `features/research-studies/actions.ts`).
 */
export function ResearchStudyDetail({
  study,
  availableSurgeries,
}: {
  study: ResearchStudyDetailView;
  availableSurgeries: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Research study</CardTitle>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
            {study.statusLabel}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ResearchStudyFieldsForm study={study} />
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <StatusActions researchStudyId={study.id} status={study.status} />
            {study.status === "DRAFT" ? (
              <DeleteResearchStudyButton researchStudyId={study.id} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Surgeries</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {study.surgeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No surgeries added yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {study.surgeries.map((surgery) => (
                <li
                  key={surgery.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <span className="text-sm">{surgery.label}</span>
                  {study.status !== "COMPLETED" ? (
                    <RemoveSurgeryButton researchStudyId={study.id} surgeryId={surgery.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {study.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground">
              A completed study&apos;s surgery universe is locked — reopen it to change.
            </p>
          ) : (
            <AddSurgeryForm researchStudyId={study.id} surgeries={availableSurgeries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
